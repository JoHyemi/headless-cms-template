import { BadRequestException, Injectable } from "@nestjs/common";
import { parse as parseHtml } from "node-html-parser";
import { ContentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PostsService } from "../posts/posts.service";
import { PagesService } from "../pages/pages.service";
import { CategoriesService } from "../categories/categories.service";
import { parseWxr, type WxrItem } from "./wxr-parser";
import { wpContentToBlocks } from "./wp-content-to-blocks";

export type ImportResult = {
  postsCreated: number;
  pagesCreated: number;
  categoriesCreated: number;
  skipped: { title: string; reason: string }[];
  failed: { title: string; reason: string }[];
};

// WordPressの投稿タイプのうち、このCMSにそのまま取り込めるのはPost/Pageに相当する
// post/pageだけ。attachment(メディア)・nav_menu_item(メニュー)・カスタム投稿タイプは
// このCMSに対応する箱がないためスキップする。
const IMPORTABLE_POST_TYPES = new Set(["post", "page"]);
// trash(ゴミ箱)・auto-draft(未保存の自動下書き)は意図的に作られたコンテンツではないため除外。
const SKIPPED_STATUSES = new Set(["trash", "auto-draft"]);

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
    private readonly pagesService: PagesService,
    private readonly categoriesService: CategoriesService
  ) {}

  async importWordpress(xml: string): Promise<ImportResult> {
    const doc = this.parse(xml);

    const result: ImportResult = {
      postsCreated: 0,
      pagesCreated: 0,
      categoriesCreated: 0,
      skipped: [],
      failed: [],
    };

    const slugToCategoryId = await this.ensureCategories(doc.categories, doc.tags, result);

    // WordPress側の投稿日時が古い順になるよう並べ替えてから作成すると、
    // このCMSのcreatedAt(作成時の自動採番)による一覧の並び順もWordPress時代の時系列に近くなる。
    const items = [...doc.items].sort((a, b) => a.postDate.localeCompare(b.postDate));

    for (const item of items) {
      const title = item.title || "(無題)";

      if (SKIPPED_STATUSES.has(item.status)) {
        result.skipped.push({ title, reason: `ステータス「${item.status}」のためスキップ` });
        continue;
      }
      if (!IMPORTABLE_POST_TYPES.has(item.postType)) {
        result.skipped.push({ title, reason: `投稿タイプ「${item.postType}」は非対応のためスキップ` });
        continue;
      }

      const blocks = wpContentToBlocks(item.contentHtml);
      if (blocks.length === 0) {
        result.skipped.push({ title, reason: "本文が空のためスキップ" });
        continue;
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

    return result;
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
