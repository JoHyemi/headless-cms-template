import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SiteService } from "../site/site.service";
import { slugify } from "../common/slugify";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly site: SiteService
  ) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    return { categories };
  }

  async create(dto: CreateCategoryDto) {
    const finalSlug = slugify(dto.slug?.trim() ? dto.slug : dto.name);
    if (!finalSlug) {
      throw new ConflictException("nameまたはslugから有効なslugを作成できません。");
    }

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug: finalSlug,
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

  async update(id: string, dto: UpdateCategoryDto) {
    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name?.trim()) data.name = dto.name.trim();
    if (dto.slug?.trim()) {
      const newSlug = slugify(dto.slug);
      if (!newSlug) throw new ConflictException("無効なslugです。");
      data.slug = newSlug;
    }

    try {
      return await this.prisma.category.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") throw new NotFoundException("カテゴリーが見つかりません。");
        if (error.code === "P2002") throw new ConflictException("既に存在するslugです。");
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.category.delete({ where: { id } });
      return { ok: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("カテゴリーが見つかりません。");
      }
      throw error;
    }
  }
}
