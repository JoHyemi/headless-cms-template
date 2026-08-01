import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PostTypeEntriesService } from "./post-type-entries.service";
import { CreatePostTypeEntryDto } from "./dto/create-post-type-entry.dto";
import { UpdatePostTypeEntryDto } from "./dto/update-post-type-entry.dto";

// 投稿タイプの「エントリー」(実データ)を扱うルート。:typeSlugをコントローラーのprefixに
// 含めることで、PostTypesController(@Controller("post-types")、定義のCRUD)とパスの深さが
// 常に1つ以上ずれるため衝突しない。posts.controller.tsと同じ並び順の原則(静的セグメント
// "all"/"slug/:slug"を":id"より先に定義する)を踏襲している。
@Controller("post-types/:typeSlug")
export class PostTypeEntriesController {
  constructor(private readonly entriesService: PostTypeEntriesService) {}

  /** GET /post-types/:typeSlug — 公開(非ログイン)アクセス。PUBLISHEDのエントリーのみ返します。 */
  @Get()
  findPublished(@Param("typeSlug") typeSlug: string) {
    return this.entriesService.findPublished(typeSlug);
  }

  /** GET /post-types/:typeSlug/all — 管理者一覧用。ログインが必要で、すべての状態を返します。 */
  @Get("all")
  @UseGuards(JwtAuthGuard)
  findAllForAdmin(@Param("typeSlug") typeSlug: string) {
    return this.entriesService.findAllForAdmin(typeSlug);
  }

  /** GET /post-types/:typeSlug/slug/:slug — 公開サイトの詳細用。PUBLISHEDでなければ404。 */
  @Get("slug/:slug")
  findBySlug(@Param("typeSlug") typeSlug: string, @Param("slug") slug: string) {
    return this.entriesService.findBySlugPublished(typeSlug, decodeURIComponent(slug));
  }

  /** GET /post-types/:typeSlug/:id — 管理者の編集画面用。状態を問わず取得可能。 */
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("typeSlug") typeSlug: string, @Param("id") id: string) {
    return this.entriesService.findOne(typeSlug, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Param("typeSlug") typeSlug: string, @Body() dto: CreatePostTypeEntryDto) {
    return this.entriesService.create(typeSlug, dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("typeSlug") typeSlug: string,
    @Param("id") id: string,
    @Body() dto: UpdatePostTypeEntryDto
  ) {
    return this.entriesService.update(typeSlug, id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("typeSlug") typeSlug: string, @Param("id") id: string) {
    return this.entriesService.remove(typeSlug, id);
  }
}
