import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PagesService } from "./pages.service";
import { CreatePageDto } from "./dto/create-page.dto";
import { UpdatePageDto } from "./dto/update-page.dto";

@Controller("pages")
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get("all")
  @UseGuards(JwtAuthGuard)
  findAllForAdmin() {
    return this.pagesService.findAllForAdmin();
  }

  @Get("slug/:slug")
  findBySlug(@Param("slug") slug: string) {
    return this.pagesService.findBySlugPublished(decodeURIComponent(slug));
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("id") id: string) {
    return this.pagesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id") id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id") id: string) {
    return this.pagesService.remove(id);
  }
}
