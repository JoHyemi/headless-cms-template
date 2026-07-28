import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { SiteService } from "../site/site.service";
import { UpdateMediaDto } from "./dto/update-media.dto";

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly site: SiteService
  ) {}

  async findAll() {
    const media = await this.prisma.media.findMany({ orderBy: { createdAt: "desc" } });
    return { media };
  }

  async register(file?: Express.Multer.File, alt?: string, caption?: string) {
    if (!file) throw new BadRequestException("アップロードするファイルがありません。");

    return this.prisma.media.create({
      data: {
        filename: file.originalname,
        url: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
        alt: alt?.trim() || null,
        caption: caption?.trim() || null,
        siteId: await this.site.getSiteId(),
      },
    });
  }

  async update(id: string, dto: UpdateMediaDto) {
    const data: Prisma.MediaUpdateInput = {};
    if (dto.alt !== undefined) data.alt = dto.alt.trim() || null;
    if (dto.caption !== undefined) data.caption = dto.caption.trim() || null;

    try {
      return await this.prisma.media.update({ where: { id }, data });
    } catch {
      throw new NotFoundException("メディアが見つかりません。");
    }
  }

  async remove(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException("メディアが見つかりません。");

    try {
      await unlink(join(process.cwd(), "uploads", media.url.replace("/uploads/", "")));
    } catch {
      // ファイルがすでになくてもDBレコードは整理します。
    }

    await this.prisma.media.delete({ where: { id } });
    return { ok: true };
  }
}
