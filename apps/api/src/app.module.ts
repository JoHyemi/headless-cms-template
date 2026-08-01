import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";
import { PrismaModule } from "./prisma/prisma.module";
import { SiteModule } from "./site/site.module";
import { AuthModule } from "./auth/auth.module";
import { PostsModule } from "./posts/posts.module";
import { PagesModule } from "./pages/pages.module";
import { CategoriesModule } from "./categories/categories.module";
import { MediaModule } from "./media/media.module";
import { BlockTypesModule } from "./block-types/block-types.module";
import { PostTypesModule } from "./post-types/post-types.module";
import { ImportModule } from "./import/import.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    SiteModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "uploads"),
      serveRoot: "/uploads",
    }),
    AuthModule,
    PostsModule,
    PagesModule,
    CategoriesModule,
    MediaModule,
    BlockTypesModule,
    PostTypesModule,
    ImportModule,
  ],
})
export class AppModule {}
