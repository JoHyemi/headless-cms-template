import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { isFieldDefArray } from "@cms/blocks";
import { PrismaService } from "../prisma/prisma.service";
import { SiteService } from "../site/site.service";
import { slugify } from "../common/slugify";
import { CreatePostTypeDto } from "./dto/create-post-type.dto";
import { UpdatePostTypeDto } from "./dto/update-post-type.dto";

// WordPressのCustom Post Typeに相当する、独自コンテンツタイプの「定義」を管理するサービス。
// BlockTypesServiceとほぼ同じ形(fields = FieldDef[])だが、対象がブロックではなく記事そのもの
// と並ぶ新しいコンテンツの種類である点が異なる。実データ(エントリー)はPostTypeEntriesServiceが担当する。
@Injectable()
export class PostTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly site: SiteService
  ) {}

  async findAll() {
    const postTypes = await this.prisma.postType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { entries: true } } },
    });
    return { postTypes };
  }

  async findOne(id: string) {
    const postType = await this.prisma.postType.findUnique({ where: { id } });
    if (!postType) throw new NotFoundException("投稿タイプが見つかりません。");
    return postType;
  }

  async create(dto: CreatePostTypeDto) {
    if (!isFieldDefArray(dto.fields)) {
      throw new BadRequestException("fieldsは有効なフィールド定義の配列である必要があります。");
    }

    const finalSlug = slugify(dto.slug?.trim() ? dto.slug : dto.name);
    if (!finalSlug) {
      throw new ConflictException("nameまたはslugから有効なslugを作成できません。");
    }

    try {
      return await this.prisma.postType.create({
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

  async update(id: string, dto: UpdatePostTypeDto) {
    const data: Prisma.PostTypeUpdateInput = {};
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
      return await this.prisma.postType.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") throw new NotFoundException("投稿タイプが見つかりません。");
        if (error.code === "P2002") throw new ConflictException("既に存在するslugです。");
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      // PostTypeEntryはonDelete: Cascadeなので、この投稿タイプに属するエントリーも一緒に削除される。
      await this.prisma.postType.delete({ where: { id } });
      return { ok: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("投稿タイプが見つかりません。");
      }
      throw error;
    }
  }
}
