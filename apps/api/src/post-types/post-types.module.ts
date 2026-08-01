import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PostTypesController } from "./post-types.controller";
import { PostTypesService } from "./post-types.service";
import { PostTypeEntriesController } from "./post-type-entries.controller";
import { PostTypeEntriesService } from "./post-type-entries.service";

@Module({
  imports: [AuthModule],
  controllers: [PostTypesController, PostTypeEntriesController],
  providers: [PostTypesService, PostTypeEntriesService],
})
export class PostTypesModule {}
