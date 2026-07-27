import { Global, Module } from "@nestjs/common";
import { SiteService } from "./site.service";

@Global()
@Module({
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
