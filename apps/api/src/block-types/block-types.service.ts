import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { isFieldDefArray } from "@cms/blocks";
import { PrismaService } from "../prisma/prisma.service";
import { SiteService } from "../site/site.service";
import { slugify } from "../common/slugify";
import { CreateBlockTypeDto } from "./dto/create-block-type.dto";
import { UpdateBlockTypeDto } from "./dto/update-block-type.dto";

@Injectable()
export class BlockTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly site: SiteService
  ) {}

  async findAll() {
    const blockTypes = await this.prisma.blockType.findMany({ orderBy: { name: "asc" } });
    return { blockTypes };
  }

  async create(dto: CreateBlockTypeDto) {
    if (!isFieldDefArray(dto.fields)) {
      throw new BadRequestException("fieldsは有効なフィールド定義の配列である必要があります。");
    }

    const finalSlug = slugify(dto.slug?.trim() ? dto.slug : dto.name);
    if (!finalSlug) {
      throw new ConflictException("nameまたはslugから有効なslugを作成できません。");
    }

    try {
      return await this.prisma.blockType.create({
        data: {
          name: dto.name.trim(),
          slug: finalSlug,
          fields: dto.fields as Prisma.InputJsonValue,
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

  async update(id: string, dto: UpdateBlockTypeDto) {
    const data: Prisma.BlockTypeUpdateInput = {};
    if (dto.name?.trim()) data.name = dto.name.trim();
    if (dto.slug?.trim()) {
      const newSlug = slugify(dto.slug);
      if (!newSlug) throw new ConflictException("無効なslugです。");
      data.slug = newSlug;
    }
    if (dto.fields !== undefined) {
      if (!isFieldDefArray(dto.fields)) {
        throw new BadRequestException("fieldsは有効なフィールド定義の配列である必要があります。");
      }
      data.fields = dto.fields as Prisma.InputJsonValue;
    }

    try {
      return await this.prisma.blockType.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") throw new NotFoundException("ブロックタイプが見つかりません。");
        if (error.code === "P2002") throw new ConflictException("既に存在するslugです。");
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.blockType.delete({ where: { id } });
      return { ok: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("ブロックタイプが見つかりません。");
      }
      throw error;
    }
  }
}
