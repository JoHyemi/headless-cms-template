import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ContentStatus, Prisma } from "@prisma/client";
import { isFieldValueMap, normalizeFieldValueMap } from "@cms/blocks";
import { PrismaService } from "../prisma/prisma.service";
import { SiteService } from "../site/site.service";
import { slugify } from "../common/slugify";
import { CreatePostTypeEntryDto } from "./dto/create-post-type-entry.dto";
import { UpdatePostTypeEntryDto } from "./dto/update-post-type-entry.dto";

// PostType(投稿タイプの定義)ごとの実データ(エントリー)を管理するサービス。PostsServiceと
// ほぼ同じ形(DRAFT/SCHEDULED/PUBLISHED + 予約公開)だが、本文がBlock[]ではなくPostType.fieldsで
// 定義されたフィールド値(fieldValues)である点、slugが投稿タイプ内でのみ一意である点が異なる。
// フィールドスキーマ(postType.fields)は呼び出し側(公開サイト・管理画面)がfieldValuesを描画する
// のに必要なため、レスポンスには常にpostTypeを添えて返す。
@Injectable()
export class PostTypeEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly site: SiteService
  ) {}

  private async findPostTypeBySlug(typeSlug: string) {
    const postType = await this.prisma.postType.findUnique({ where: { slug: typeSlug } });
    if (!postType) throw new NotFoundException("投稿タイプが見つかりません。");
    return postType;
  }

  async findPublished(typeSlug: string) {
    const postType = await this.findPostTypeBySlug(typeSlug);
    const entries = await this.prisma.postTypeEntry.findMany({
      where: { postTypeId: postType.id, status: ContentStatus.PUBLISHED },
      orderBy: { createdAt: "desc" },
    });
    return { postType, entries };
  }

  async findAllForAdmin(typeSlug: string) {
    const postType = await this.findPostTypeBySlug(typeSlug);
    const entries = await this.prisma.postTypeEntry.findMany({
      where: { postTypeId: postType.id },
      orderBy: { createdAt: "desc" },
    });
    return { postType, entries };
  }

  async findBySlugPublished(typeSlug: string, slug: string) {
    const postType = await this.findPostTypeBySlug(typeSlug);
    const entry = await this.prisma.postTypeEntry.findUnique({
      where: { postTypeId_slug: { postTypeId: postType.id, slug } },
    });
    if (!entry || entry.status !== ContentStatus.PUBLISHED) {
      throw new NotFoundException("エントリーが見つかりません。");
    }
    return { postType, entry };
  }

  async findOne(typeSlug: string, id: string) {
    const postType = await this.findPostTypeBySlug(typeSlug);
    const entry = await this.prisma.postTypeEntry.findUnique({ where: { id } });
    if (!entry || entry.postTypeId !== postType.id) {
      throw new NotFoundException("エントリーが見つかりません。");
    }
    return { postType, entry };
  }

  async create(typeSlug: string, dto: CreatePostTypeEntryDto) {
    const postType = await this.findPostTypeBySlug(typeSlug);

    const fieldValues = this.validateFieldValues(dto.fieldValues);

    const baseSlug = slugify(dto.slug?.trim() ? dto.slug : dto.title);
    if (!baseSlug) {
      throw new BadRequestException("titleまたはslugから有効なslugを作成できません。");
    }

    this.validateScheduling(dto.status, dto.publishAt);

    try {
      return await this.prisma.postTypeEntry.create({
        data: {
          title: dto.title.trim(),
          slug: await this.ensureUniqueSlug(postType.id, baseSlug),
          fieldValues: fieldValues as Prisma.InputJsonValue,
          status: dto.status ?? ContentStatus.DRAFT,
          publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
          postTypeId: postType.id,
          siteId: await this.site.getSiteId(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("既に存在するslugです。");
      }
      throw error;
    }
  }

  async update(typeSlug: string, id: string, dto: UpdatePostTypeEntryDto) {
    const postType = await this.findPostTypeBySlug(typeSlug);
    const existing = await this.prisma.postTypeEntry.findUnique({ where: { id } });
    if (!existing || existing.postTypeId !== postType.id) {
      throw new NotFoundException("エントリーが見つかりません。");
    }

    this.validateScheduling(dto.status, dto.publishAt);

    const data: Prisma.PostTypeEntryUpdateInput = {};
    if (dto.title?.trim()) data.title = dto.title.trim();
    if (dto.fieldValues !== undefined) {
      data.fieldValues = this.validateFieldValues(dto.fieldValues) as Prisma.InputJsonValue;
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.publishAt !== undefined) data.publishAt = new Date(dto.publishAt);
    if (dto.slug?.trim()) {
      const newSlug = slugify(dto.slug);
      if (!newSlug) throw new BadRequestException("無効なslugです。");
      data.slug = newSlug;
    }

    try {
      return await this.prisma.postTypeEntry.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("既に存在するslugです。");
      }
      throw error;
    }
  }

  async remove(typeSlug: string, id: string) {
    const postType = await this.findPostTypeBySlug(typeSlug);
    const existing = await this.prisma.postTypeEntry.findUnique({ where: { id } });
    if (!existing || existing.postTypeId !== postType.id) {
      throw new NotFoundException("エントリーが見つかりません。");
    }
    await this.prisma.postTypeEntry.delete({ where: { id } });
    return { ok: true };
  }

  private validateFieldValues(value: unknown): Record<string, Prisma.InputJsonValue> {
    if (value === undefined) return {};
    if (!isFieldValueMap(value)) {
      throw new BadRequestException("fieldValuesはstring/number/booleanのみを値に持つオブジェクトである必要があります。");
    }
    return normalizeFieldValueMap(value);
  }

  /** 同じ投稿タイプ内で同じslugが既にあれば、末尾に-2, -3...を付けて一意にします。 */
  private async ensureUniqueSlug(postTypeId: string, baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;
    while (
      await this.prisma.postTypeEntry.findUnique({
        where: { postTypeId_slug: { postTypeId, slug: candidate } },
      })
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private validateScheduling(status: ContentStatus | undefined, publishAt: string | undefined) {
    if (status !== ContentStatus.SCHEDULED) return;
    if (!publishAt) {
      throw new BadRequestException("予約公開には公開予定日時(publishAt)の指定が必要です。");
    }
    if (new Date(publishAt).getTime() <= Date.now()) {
      throw new BadRequestException("公開予定日時は未来の日時を指定してください。");
    }
  }

  /** 1分ごとに、予約時刻を過ぎたSCHEDULEDエントリーをPUBLISHEDへ切り替えます(投稿タイプ横断)。 */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledEntries() {
    await this.prisma.postTypeEntry.updateMany({
      where: { status: ContentStatus.SCHEDULED, publishAt: { lte: new Date() } },
      data: { status: ContentStatus.PUBLISHED },
    });
  }
}
