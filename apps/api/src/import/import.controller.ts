import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ImportService } from "./import.service";

@Controller("import")
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  // WordPressのWXRエクスポートファイル(Tools > Export で書き出したXML)を
  // まるごと取り込む「オールインワン」インポート。ディスクに保存する必要はないため
  // memoryStorageでメモリ上のバッファとして受け取り、そのままテキストとして解析する。
  @Post("wordpress")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // WXRはテキストなので50MBもあれば十分大きい
    })
  )
  async importWordpress(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("インポートするXMLファイル(file)を送信してください。");
    }
    const xml = file.buffer.toString("utf-8");
    return this.importService.importWordpress(xml);
  }
}
