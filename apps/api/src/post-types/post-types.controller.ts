import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PostTypesService } from "./post-types.service";
import { CreatePostTypeDto } from "./dto/create-post-type.dto";
import { UpdatePostTypeDto } from "./dto/update-post-type.dto";

// 投稿タイプの「定義」(フィールド構成)を管理するルート。管理画面がエントリー編集フォームを
// 組み立てるためだけに使うスキーマ情報なので、block-typesと同様すべてログイン必須にしている。
// エントリー本体(実データ)のルートはpost-type-entries.controller.ts(@Controller("post-types/:typeSlug"))が
// 担当する — パスの深さが異なるため("/post-types" vs "/post-types/:typeSlug/...")互いに衝突しない。
@Controller("post-types")
@UseGuards(JwtAuthGuard)
export class PostTypesController {
  constructor(private readonly postTypesService: PostTypesService) {}

  @Get()
  findAll() {
    return this.postTypesService.findAll();
  }

  @Post()
  create(@Body() dto: CreatePostTypeDto) {
    return this.postTypesService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePostTypeDto) {
    return this.postTypesService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.postTypesService.remove(id);
  }
}
