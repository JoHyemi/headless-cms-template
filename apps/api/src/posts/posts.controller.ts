import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PostsService } from "./posts.service";
import { CreatePostDto } from "./dto/create-post.dto";
import { UpdatePostDto } from "./dto/update-post.dto";

@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /** GET /posts?category=slug — 공개(비로그인) 접근. PUBLISHED 글만 반환합니다. */
  @Get()
  findPublished(@Query("category") category?: string) {
    return this.postsService.findPublished(category);
  }

  /** GET /posts/all — 관리자 목록용. 로그인 필요, 모든 상태의 글을 반환합니다. */
  @Get("all")
  @UseGuards(JwtAuthGuard)
  findAllForAdmin() {
    return this.postsService.findAllForAdmin();
  }

  /** GET /posts/slug/:slug — 공개 사이트의 글 상세용. PUBLISHED가 아니면 404. */
  @Get("slug/:slug")
  findBySlug(@Param("slug") slug: string) {
    return this.postsService.findBySlugPublished(decodeURIComponent(slug));
  }

  /** GET /posts/:id — 관리자 수정 화면용. 로그인 필요, 상태 무관하게 조회 가능. */
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
