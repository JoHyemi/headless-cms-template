import { BadRequestException, Injectable } from "@nestjs/common";
import { parse as parseHtml } from "node-html-parser";
import { ContentStatus } from "@prisma/client";
import type { FieldDef } from "@cms/blocks";
import { PrismaService } from "../prisma/prisma.service";
import { PostsService } from "../posts/posts.service";
import { PagesService } from "../pages/pages.service";
import { CategoriesService } from "../categories/categories.service";
import { PostTypesService } from "../post-types/post-types.service";
import { PostTypeEntriesService } from "../post-types/post-type-entries.service";
import { slugify } from "../common/slugify";
import { parseWxr, type WxrItem, type WxrMeta } from "./wxr-parser";
import { wpContentToBlocks } from "./wp-content-to-blocks";

export type ImportResult = {
  postsCreated: number;
  pagesCreated: number;
  categoriesCreated: number;
  postTypesCreated: number;
  postTypeEntriesCreated: number;
  skipped: { title: string; reason: string }[];
  failed: { title: string; reason: string }[];
};

// WordPress本体が内部管理用に使う投稿タイプ。ユーザーが書いたコンテンツではないため、
// カスタム投稿タイプとしての取り込み対象からも除外する。
const EXCLUDED_POST_TYPES = new Set([
  "attachment",
  "nav_menu_item",
  "revision",
  "custom_css",
  "customize_changeset",
  "oembed_cache",
  "user_request",
  "wp_global_styles",
  "wp_navigation",
  "wp_template",
  "wp_template_part",
  "wp_font_family",
  "wp_font_face",
]);
// trash(ゴミ箱)・auto-draft(未保存の自動下書き)は意図的に作られたコンテンツではないため除外。
const SKIPPED_STATUSES = new Set(["trash", "auto-draft"]);
// WordPressの内部用メタキー(アンダースコア始まり。例: _edit_lock, _thumbnail_id, ACFの
// フィールド定義参照用シャドウキーなど)は実際の入力値ではないため取り込み対象から除外する。
const INTERNAL_META_PREFIX = "_";

// PHPのserialize()形式(配列・オブジェクト等)の値をざっくり検出する。ACFのリピーター/
// チェックボックスのような複合値はこの形式で保存されており、そのままテキストとして
// 表示すると意味の通らない文字列になるため、カスタムフィールドとしての取り込み対象から外す。
function isPhpSerialized(value: string): boolean {
  return /^[aOs]:\d+[:{]/.test(value) || /^(b|i|d):[^;]*;/.test(value) || value === "N;";
}

/** wp:postmetaから、実際の入力値と思われるものだけを残す(内部用キー・シリアライズ値・
 *  空値・重複キーを除外)。 */
function cleanMeta(meta: WxrMeta[]): WxrMeta[] {
  const seenKeys = new Set<string>();
  const cleaned: WxrMeta[] = [];
  for (const { key, value } of meta) {
    if (!key || key.startsWith(INTERNAL_META_PREFIX)) continue;
    if (!value || isPhpSerialized(value)) continue;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    cleaned.push({ key, value });
  }
  return cleaned;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
    private readonly pagesService: PagesService,
    private readonly categoriesService: CategoriesService,
    private readonly postTypesService: PostTypesService,
    private readonly postTypeEntriesService: PostTypeEntriesService
  ) {}

  async importWordpress(xml: string): Promise<ImportResult> {
    const doc = this.parse(xml);

    const result: ImportResult = {
      postsCreated: 0,
      pagesCreated: 0,
      categoriesCreated: 0,
      postTypesCreated: 0,
      postTypeEntriesCreated: 0,
      skipped: [],
      failed: [],
    };

    const slugToCategoryId = await this.ensureCategories(doc.categories, doc.tags, result);

    // WordPress側の投稿日時が古い順になるよう並べ替えてから作成すると、
    // このCMSのcreatedAt(作成時の自動採番)による一覧の並び順もWordPress時代の時系列に近くなる。
    const items = [...doc.items].sort((a, b) => a.postDate.localeCompare(b.postDate));

    // post/page以外の投稿タイプ(WordPressのカスタム投稿タイプ)は、このCMSのカスタム投稿タイプ
    // (PostType/PostTypeEntry)へ後段でまとめて取り込む — 投稿タイプごとにフィールド構成を
    // 決めてから定義を作る必要があるため、先に投稿タイプ単位でグルーピングしておく。
    const customItemsByType = new Map<string, WxrItem[]>();

    for (const item of items) {
      const title = item.title || "(無題)";

      if (SKIPPED_STATUSES.has(item.status)) {
        result.skipped.push({ title, reason: `ステータス「${item.status}」のためスキップ` });
        continue;
      }

      if (item.postType === "post" || item.postType === "page") {
        await this.importPostOrPage(item, title, slugToCategoryId, result);
        continue;
      }

      if (EXCLUDED_POST_TYPES.has(item.postType)) {
        result.skipped.push({ title, reason: `投稿タイプ「${item.postType}」は非対応のためスキップ` });
        continue;
      }

      const bucket = customItemsByType.get(item.postType);
      if (bucket) bucket.push(item);
      else customItemsByType.set(item.postType, [item]);
    }

    await this.importCustomPostTypes(customItemsByType, result);

    return result;
  }

  /** post/page(Post/Pageに直接対応する投稿タイプ)を1件取り込む。 */
  private async importPostOrPage(
    item: WxrItem,
    title: string,
    slugToCategoryId: Map<string, string>,
    result: ImportResult
  ): Promise<void> {
    const blocks = wpContentToBlocks(item.contentHtml);
    if (blocks.length === 0) {
      result.skipped.push({ title, reason: "本文が空のためスキップ" });
      return;
    }

    const { status, publishAt } = this.mapStatus(item.status, item.postDate);
    const excerpt = this.plainText(item.excerptHtml) || undefined;

    try {
      if (item.postType === "post") {
        const categoryIds = [...item.categorySlugs, ...item.tagSlugs]
          .map((slug) => slugToCategoryId.get(slug))
          .filter((id): id is string => Boolean(id));

        await this.postsService.create({
          title,
          content: blocks,
          excerpt,
          status,
          publishAt,
          author: item.author,
          slug: item.slug || undefined,
          categoryIds,
        });
        result.postsCreated += 1;
      } else {
        await this.pagesService.create({
          title,
          content: blocks,
          status,
          publishAt,
          slug: item.slug || undefined,
        });
        result.pagesCreated += 1;
      }
    } catch (error) {
      result.failed.push({ title, reason: error instanceof Error ? error.message : "不明なエラー" });
    }
  }

  /** post/page以外の投稿タイプを、投稿タイプ(wp:post_type)ごとにこのCMSのカスタム投稿タイプ
   *  (PostType)として定義し、各項目をエントリー(PostTypeEntry)として作成する。
   *  本文(content:encoded)・抜粋・カスタムフィールド(wp:postmeta)は、このCMSのブロック形式
   *  ではなくPostTypeEntry.fieldValuesが期待するプレーンな文字列として保存する
   *  (生HTMLを保存しない設計方針に合わせ、HTMLタグはplainText()で除去する)。 */
  private async importCustomPostTypes(
    customItemsByType: Map<string, WxrItem[]>,
    result: ImportResult
  ): Promise<void> {
    if (customItemsByType.size === 0) return;

    const existingPostTypes = await this.prisma.postType.findMany();
    const slugToPostType = new Map(existingPostTypes.map((pt) => [pt.slug, pt]));

    for (const [wpPostType, groupItems] of customItemsByType) {
      const typeSlug = slugify(wpPostType) || wpPostType;
      let postType = slugToPostType.get(typeSlug);

      if (!postType) {
        try {
          postType = await this.postTypesService.create({
            name: wpPostType,
            slug: typeSlug,
            fields: this.buildCustomFieldSchema(groupItems),
          });
          slugToPostType.set(postType.slug, postType);
          result.postTypesCreated += 1;
        } catch (error) {
          const reason =
            error instanceof Error
              ? `カスタム投稿タイプ「${wpPostType}」の作成に失敗: ${error.message}`
              : `カスタム投稿タイプ「${wpPostType}」の作成に失敗しました。`;
          for (const item of groupItems) {
            result.skipped.push({ title: item.title || "(無題)", reason });
          }
          continue;
        }
      }

      for (const item of groupItems) {
        const title = item.title || "(無題)";
        const { status, publishAt } = this.mapStatus(item.status, item.postDate);

        try {
          await this.postTypeEntriesService.create(postType.slug, {
            title,
            slug: item.slug || undefined,
            fieldValues: this.buildFieldValues(item),
            status,
            publishAt,
          });
          result.postTypeEntriesCreated += 1;
        } catch (error) {
          result.failed.push({
            title,
            reason: error instanceof Error ? error.message : "不明なエラー",
          });
        }
      }
    }
  }

  /** カスタム投稿タイプのグループ内の項目から、フィールド構成(FieldDef[])を組み立てる。
   *  本文は常に含め(空でも取り込み先が壊れないよう)、抜粋はいずれかの項目にあれば含め、
   *  カスタムフィールドはグループ内で見つかったキーを出現順に追加する。 */
  private buildCustomFieldSchema(items: WxrItem[]): FieldDef[] {
    const fields: FieldDef[] = [{ key: "content", label: "本文", type: "textarea" }];
    const seenKeys = new Set<string>(["content"]);

    if (items.some((item) => this.plainText(item.excerptHtml).length > 0)) {
      fields.push({ key: "excerpt", label: "抜粋", type: "textarea" });
      seenKeys.add("excerpt");
    }

    for (const item of items) {
      for (const { key } of cleanMeta(item.meta)) {
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        fields.push({ key, label: key, type: "text" });
      }
    }

    return fields;
  }

  /** buildCustomFieldSchema()が定義したフィールドに対応する、1項目分の実際の値。 */
  private buildFieldValues(item: WxrItem): Record<string, string> {
    const values: Record<string, string> = { content: this.plainText(item.contentHtml) };

    const excerpt = this.plainText(item.excerptHtml);
    if (excerpt) values.excerpt = excerpt;

    for (const { key, value } of cleanMeta(item.meta)) {
      values[key] = value;
    }

    return values;
  }

  private parse(xml: string) {
    try {
      return parseWxr(xml);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? `WXRファイルの解析に失敗しました: ${error.message}`
          : "WXRファイルの解析に失敗しました。"
      );
    }
  }

  /** WordPressのカテゴリー・タグをこのCMSのCategoryとして用意し、slug→idのマップを返す。
   *  タグもCategoryへ合流させる(このCMSはタグの概念を持たないため)。 */
  private async ensureCategories(
    categories: { niceName: string; name: string }[],
    tags: { slug: string; name: string }[],
    result: ImportResult
  ): Promise<Map<string, string>> {
    const existing = await this.prisma.category.findMany();
    const slugToId = new Map(existing.map((c) => [c.slug, c.id]));

    const taxonomy = [
      ...categories.map((c) => ({ slug: c.niceName, name: c.name || c.niceName })),
      ...tags.map((t) => ({ slug: t.slug, name: t.name || t.slug })),
    ];

    for (const tax of taxonomy) {
      if (!tax.slug || slugToId.has(tax.slug)) continue;
      try {
        const created = await this.categoriesService.create({ name: tax.name, slug: tax.slug });
        slugToId.set(tax.slug, created.id);
        result.categoriesCreated += 1;
      } catch {
        // 既に存在する等の理由で作成できなかった場合は、そのカテゴリー紐付けだけ諦める
        // (記事自体のインポートは継続する)。
      }
    }

    return slugToId;
  }

  /** WordPressのステータス文字列をこのCMSのContentStatusへ変換する。
   *  publish以外(draft/pending/private等)は安全側でDRAFTに倒す。 */
  private mapStatus(
    wpStatus: string,
    wpPostDate: string
  ): { status: ContentStatus; publishAt?: string } {
    if (wpStatus === "publish") return { status: ContentStatus.PUBLISHED };

    if (wpStatus === "future") {
      // wp:post_dateはタイムゾーン情報のないローカル時刻文字列("YYYY-MM-DD HH:mm:ss")。
      // エクスポート元サーバーのタイムゾーンは分からないため、このサーバーのローカル
      // タイムゾーンとして解釈する(簡易対応。厳密なタイムゾーン変換はしない)。
      const date = new Date(wpPostDate.replace(" ", "T"));
      if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
        return { status: ContentStatus.SCHEDULED, publishAt: date.toISOString() };
      }
      // 過去日付になってしまった予約投稿はDRAFTに倒す(SCHEDULEDには未来日時が必須のため)。
      return { status: ContentStatus.DRAFT };
    }

    return { status: ContentStatus.DRAFT };
  }

  private plainText(html: string): string {
    if (!html.trim()) return "";
    return parseHtml(html).text.replace(/\s+/g, " ").trim();
  }
}
