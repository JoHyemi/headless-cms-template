import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * structure.mdの「1 CMS = 1 Site」原則に従い、V1ではSiteがちょうど1つだけ存在すると
 * 仮定します。このサービスはその単一Siteのidを取得してキャッシュし、他のサービスが
 * 毎回Siteを問い合わせなくてもsiteIdを埋められるようにします。マルチサイトが必要になったら、
 * このサービスをリクエストコンテキスト(例: ドメインベースのsite解決)に置き換えれば済みます。
 */
@Injectable()
export class SiteService {
  private cachedSiteId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getSiteId(): Promise<string> {
    if (this.cachedSiteId) return this.cachedSiteId;

    const site = await this.prisma.site.findFirst({ orderBy: { createdAt: "asc" } });
    if (!site) {
      throw new Error("Siteが存在しません。先にprisma/seed.tsを実行してください。");
    }

    this.cachedSiteId = site.id;
    return site.id;
  }
}
