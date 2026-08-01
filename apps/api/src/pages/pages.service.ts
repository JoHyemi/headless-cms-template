import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ContentStatus, Prisma } from "@prisma/client";
import { isBlockArray, normalizeBlocks, toContentDTO } from "@cms/blocks";
import { PrismaService } from "../prisma/prisma.service";
import { SiteService } from "../site/site.service";
import { slugify } from "../common/slugify";
import { CreatePageDto } from "./dto/create-page.dto";
import { UpdatePageDto } from "./dto/update-page.dto";

// contentHtml内の画像相対パス(/uploads/...)を絶対URLにするためのベースURL。
const MEDIA_BASE_URL = process.env.PUBLIC_API_URL;

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly site: SiteService
  ) {}

  async findAllForAdmin() {
    const pages = await this.prisma.page.findMany({ orderBy: { createdAt: "desc" } });
    return { pages: pages.map((page) => toContentDTO(page, MEDIA_BASE_URL)) };
  }

  async findBySlugPublished(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || page.status !== ContentStatus.PUBLISHED) {
      throw new NotFoundException("ページが見つかりません。");
    }
    return toContentDTO(page, MEDIA_BASE_URL);
  }

  async findOne(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("ページが見つかりません。");
    return toContentDTO(page, MEDIA_BASE_URL);
  }

  async create(dto: CreatePageDto) {
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
      const page = await this.prisma.page.create({
        data: {
          title: dto.title.trim(),
          slug: await this.ensureUniqueSlug(baseSlug),
          content: blocks as unknown as Prisma.InputJsonValue,
          status: dto.status ?? ContentStatus.DRAFT,
          publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
          siteId: await this.site.getSiteId(),
        },
      });
      return toContentDTO(page, MEDIA_BASE_URL);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("既に存在するslugです。");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePageDto) {
    this.validateScheduling(dto.status, dto.publishAt);

    const data: Prisma.PageUpdateInput = {};

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

    if (dto.status !== undefined) data.status = dto.status;
    if (dto.publishAt !== undefined) data.publishAt = new Date(dto.publishAt);
    if (dto.slug?.trim()) {
      const newSlug = slugify(dto.slug);
      if (!newSlug) throw new BadRequestException("無効なslugです。");
      data.slug = newSlug;
    }

    try {
      const page = await this.prisma.page.update({ where: { id }, data });
      return toContentDTO(page, MEDIA_BASE_URL);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") throw new NotFoundException("ページが見つかりません。");
        if (error.code === "P2002") throw new ConflictException("既に存在するslugです。");
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.page.delete({ where: { id } });
      return { ok: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("ページが見つかりません。");
      }
      throw error;
    }
  }

  /** 同じslugが既にあれば、末尾に-2, -3...を付けて一意にします。 */
  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;
    while (await this.prisma.page.findUnique({ where: { slug: candidate } })) {
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

  /** 1分ごとに、予約時刻を過ぎたSCHEDULEDページをPUBLISHEDへ切り替えます(Postと同様)。 */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledPages() {
    await this.prisma.page.updateMany({
      where: { status: ContentStatus.SCHEDULED, publishAt: { lte: new Date() } },
      data: { status: ContentStatus.PUBLISHED },
    });
  }
}
