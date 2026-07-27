import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * structure.md의 "1 CMS = 1 Site" 원칙에 따라 V1은 Site가 정확히 하나만 존재한다고
 * 가정합니다. 이 서비스는 그 단일 Site의 id를 조회 후 캐싱해, 다른 서비스들이
 * 매번 Site를 조회하지 않고도 siteId를 채울 수 있게 합니다. 멀티사이트가 필요해지면
 * 이 서비스를 요청 컨텍스트(예: 도메인 기반 site 해석)로 교체하면 됩니다.
 */
@Injectable()
export class SiteService {
  private cachedSiteId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getSiteId(): Promise<string> {
    if (this.cachedSiteId) return this.cachedSiteId;

    const site = await this.prisma.site.findFirst({ orderBy: { createdAt: "asc" } });
    if (!site) {
      throw new Error("Site가 존재하지 않습니다. prisma/seed.ts를 먼저 실행해주세요.");
    }

    this.cachedSiteId = site.id;
    return site.id;
  }
}
