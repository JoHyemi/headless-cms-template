import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ContentStatus, Prisma } from "@prisma/client";
import { blocksToPlainText, isBlockArray, normalizeBlocks, toContentDTO } from "@cms/blocks";
import { PrismaService } from "../prisma/prisma.service";
import { SiteService } from "../site/site.service";
import { makeExcerpt, slugify } from "../common/slugify";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

const includeCategories = { categories: true } as const;

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
    return { posts: posts.map(toContentDTO) };
  }

  async findAllForAdmin() {
    const posts = await this.prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: includeCategories,
    });
    return { posts: posts.map(toContentDTO) };
  }

  async findBySlugPublished(slug: string) {
    const post = await this.prisma.post.findUnique({ where: { slug }, include: includeCategories });
    if (!post || post.status !== ContentStatus.PUBLISHED) {
      throw new NotFoundException("記事が見つかりません。");
    }
    return toContentDTO(post);
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id }, include: includeCategories });
    if (!post) throw new NotFoundException("記事が見つかりません。");
    return toContentDTO(post);
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

    try {
      const post = await this.prisma.post.create({
        data: {
          title: dto.title.trim(),
          slug: await this.ensureUniqueSlug(baseSlug),
          content: blocks as unknown as Prisma.InputJsonValue,
          excerpt: dto.excerpt?.trim() || makeExcerpt(blocksToPlainText(blocks)),
          status: dto.status ?? ContentStatus.DRAFT,
          author: dto.author?.trim() || undefined,
          siteId: await this.site.getSiteId(),
          categories: dto.categoryIds
            ? { connect: dto.categoryIds.map((id) => ({ id })) }
            : undefined,
        },
        include: includeCategories,
      });
      return toContentDTO(post);
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
      return toContentDTO(post);
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

  /** 동일한 slug가 있으면 뒤에 -2, -3 ... 을 붙여 유일하게 만듭니다. */
  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 2;
    while (await this.prisma.post.findUnique({ where: { slug: candidate } })) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
