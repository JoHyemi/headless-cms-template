import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BlockTypesController } from "./block-types.controller";
import { BlockTypesService } from "./block-types.service";

@Module({
  imports: [AuthModule],
  controllers: [BlockTypesController],
  providers: [BlockTypesService],
  exports: [BlockTypesService],
})
export class BlockTypesModule {}
