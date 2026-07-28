import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BlockTypesService } from "./block-types.service";
import { CreateBlockTypeDto } from "./dto/create-block-type.dto";
import { UpdateBlockTypeDto } from "./dto/update-block-type.dto";

// 管理画面がカスタムブロックの編集フォームを組み立てるためだけに使うスキーマ情報なので、
// 公開サイト・外部の消費者向けの用途はなく、すべてのルートをログイン必須にしています。
@Controller("block-types")
@UseGuards(JwtAuthGuard)
export class BlockTypesController {
  constructor(private readonly blockTypesService: BlockTypesService) {}

  @Get()
  findAll() {
    return this.blockTypesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateBlockTypeDto) {
    return this.blockTypesService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateBlockTypeDto) {
    return this.blockTypesService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.blockTypesService.remove(id);
  }
}
