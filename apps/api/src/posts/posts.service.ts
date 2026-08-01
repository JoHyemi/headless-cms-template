import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ContentStatus, Prisma } from "@prisma/client";
import { blocksToPlainText, isBlockArray, normalizeBlocks, toContentDTO } from "@cms/blocks";
import { PrismaService } from "../prisma/prisma.service";
import { SiteService } from "../site/site.service";
import { makeExcerpt, slugify } from "../common/slugify";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

const includeCategories = { categories: true } as const;
// contentHtml内の画像相対パス(/uploads/...)を絶対URLにするためのベースURL。
// 実行時のDB接続先ではなく、外部から見えるAPIの公開アドレスを指す。
const MEDIA_BASE_URL = process.env.PUBLIC_API_URL;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly site: SiteService
  ) {}

  async findPublished(category?: string) {
    const posts = await this.prisma.post.findMany({
      where: {
        status: ContentStatus.PUBLISHED,
        ...(category ? { categories: { some: { slug: category } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: includeCategories,
    });
    return { posts: posts.map((post) => toContentDTO(post, MEDIA_BASE_URL)) };
  }

  async findAllForAdmin() {
    const posts = await this.prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: includeCategories,
    });
    return { posts: posts.map((post) => toContentDTO(post, MEDIA_BASE_URL)) };
  }

  async findBySlugPublished(slug: string) {
    const post = await this.prisma.post.findUnique({ where: { slug }, include: includeCategories });
    if (!post || post.status !== ContentStatus.PUBLISHED) {
      throw new NotFoundException("記事が見つかりません。");
    }
    return toContentDTO(post, MEDIA_BASE_URL);
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id }, include: includeCategories });
    if (!post) throw new NotFoundException("記事が見つかりません。");
    return toContentDTO(post, MEDIA_BASE_URL);
  }

  async create(dto: CreatePostDto) {
    if (!isBlockArray(dto.content)) {
      throw new BadRequestException("contentはブロック配列である必要があります。");
    }
    const blocks = normalizeBlocks(dto.content);
    if (blocks.length === 0) {
      throw new BadRequestException("本文の内容を入力する必要があります。");
    }

    const baseSlug = slugify(dto.slug?.trim() ? dto.slug : dto.title);
    if (!baseSlug) {
      throw new BadRequestException("titleまたはslugから有効なslugを作成できません。");
    }

    this.validateScheduling(dto.status, dto.publishAt);

    try {
      const post = await this.prisma.post.create({
        data: {
          title: dto.title.trim(),
          slug: await this.ensureUniqueSlug(baseSlug),
          content: blocks as unknown as Prisma.InputJsonValue,
          excerpt: dto.excerpt?.trim() || makeExcerpt(blocksToPlainText(blocks)),
          status: dto.status ?? ContentStatus.DRAFT,
          publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
          author: dto.author?.trim() || undefined,
          siteId: await this.site.getSiteId(),
          categories: dto.categoryIds
            ? { connect: dto.categoryIds.map((id) => ({ id })) }
            : undefined,
        },
        include: includeCategories,
      });
      return toContentDTO(post, MEDIA_BASE_URL);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") throw new ConflictException("既に存在するslugです。");
        if (error.code === "P2025") {
          throw new BadRequestException("存在しないカテゴリーが含まれています。");
        }
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePostDto) {
    this.validateScheduling(dto.status, dto.publishAt);

    const data: Prisma.PostUpdateInput = {};

    if (dto.title?.trim()) data.title = dto.title.trim();

    if (dto.content !== undefined) {
      if (!isBlockArray(dto.content)) {
        throw new BadRequestException("contentはブロック配列である必要があります。");
      }
      const blocks = normalizeBlocks(dto.content);
      if (blocks.length === 0) {
        throw new BadRequestException("本文の内容を入力する必要があります。");
      }
      data.content = blocks as unknown as Prisma.InputJsonValue;
    }

    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt.trim() || null;
    if (dto.author?.trim()) data.author = dto.author.trim();
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.publishAt !== undefined) data.publishAt = new Date(dto.publishAt);
    if (dto.slug?.trim()) {
      const newSlug = slugify(dto.slug);
      if (!newSlug) throw new BadRequestException("無効なslugです。");
      data.slug = newSlug;
    }
    if (dto.categoryIds !== undefined) {
      data.categories = { set: dto.categoryIds.map((id) => ({ id })) };
    }

    try {
      const post = await this.prisma.post.update({ where: { id }, data, include: includeCategories });
      return toContentDTO(post, MEDIA_BASE_URL);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundException("記事またはカテゴリーが見つかりません。");
        }
        if (error.code === "P2002") throw new ConflictException("既に存在するslugです。");
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.post.delete({ where: { id } });
      return { ok: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("記事が見つかりません。");
      }
      throw error;
    }
  }

  /** 同じslugが既にあれば、末尾に-2, -3...を付けて一意にします。 */
  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;
    while (await this.prisma.post.findUnique({ where: { slug: candidate } })) {
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

  /** 1分ごとに、予約時刻を過ぎたSCHEDULED記事をPUBLISHEDへ切り替えます。
   *  DBのpublishAtで判定するため、サーバー再起動をまたいでも予約は失われません。 */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledPosts() {
    await this.prisma.post.updateMany({
      where: { status: ContentStatus.SCHEDULED, publishAt: { lte: new Date() } },
      data: { status: ContentStatus.PUBLISHED },
    });
  }
}
