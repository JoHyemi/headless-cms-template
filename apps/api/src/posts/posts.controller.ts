import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /** GET /posts?category=slug — 公開(非ログイン)アクセス。PUBLISHEDの記事のみ返します。 */
  @Get()
  findPublished(@Query("category") category?: string) {
    return this.postsService.findPublished(category);
  }

  /** GET /posts/all — 管理者一覧用。ログインが必要で、すべての状態の記事を返します。 */
  @Get("all")
  @UseGuards(JwtAuthGuard)
  findAllForAdmin() {
    return this.postsService.findAllForAdmin();
  }

  /** GET /posts/slug/:slug — 公開サイトの記事詳細用。PUBLISHEDでなければ404。 */
  @Get("slug/:slug")
  findBySlug(@Param("slug") slug: string) {
    return this.postsService.findBySlugPublished(decodeURIComponent(slug));
  }

  /** GET /posts/:id — 管理者の編集画面用。ログインが必要で、状態を問わず取得可能。 */
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("id") id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id") id: string, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id") id: string) {
    return this.postsService.remove(id);
  }
}
