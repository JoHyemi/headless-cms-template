import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PostsModule } from "../posts/posts.module";
import { PagesModule } from "../pages/pages.module";
import { CategoriesModule } from "../categories/categories.module";
import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";

@Module({
  imports: [AuthModule, PostsModule, PagesModule, CategoriesModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
