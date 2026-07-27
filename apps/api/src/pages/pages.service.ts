import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ContentStatus, Prisma } from "@prisma/client";
import { isBlockArray, normalizeBlocks, toContentDTO } from "@cms/blocks";
import { PrismaService } from "../prisma/prisma.service";
import { SiteService } from "../site/site.service";
import { slugify } from "../common/slugify";
import { CreatePageDto } from "./dto/create-page.dto";
import { UpdatePageDto } from "./dto/update-page.dto";

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly site: SiteService
  ) {}

  async findAllForAdmin() {
    const pages = await this.prisma.page.findMany({ orderBy: { createdAt: "desc" } });
    return { pages: pages.map(toContentDTO) };
  }

  async findBySlugPublished(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || page.status !== ContentStatus.PUBLISHED) {
      throw new NotFoundException("ページが見つかりません。");
    }
    return toContentDTO(page);
  }

  async findOne(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("ページが見つかりません。");
    return toContentDTO(page);
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

    try {
      const page = await this.prisma.page.create({
        data: {
          title: dto.title.trim(),
          slug: await this.ensureUniqueSlug(baseSlug),
          content: blocks as unknown as Prisma.InputJsonValue,
          status: dto.status ?? ContentStatus.DRAFT,
          siteId: await this.site.getSiteId(),
        },
      });
      return toContentDTO(page);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("既に存在するslugです。");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdatePageDto) {
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
    if (dto.slug?.trim()) {
      const newSlug = slugify(dto.slug);
      if (!newSlug) throw new BadRequestException("無効なslugです。");
      data.slug = newSlug;
    }

    try {
      const page = await this.prisma.page.update({ where: { id }, data });
      return toContentDTO(page);
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

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;
    while (await this.prisma.page.findUnique({ where: { slug: candidate } })) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
