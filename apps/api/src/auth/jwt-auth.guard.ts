import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthService, SessionPayload } from "./auth.service";

export type RequestWithSession = Request & { session?: SessionPayload };

/**
 * 세션 쿠키(httpOnly JWT)를 검증하는 가드. Passport 없이 직접 구현한 이유는
 * 전략(strategy)이 하나뿐이라 Passport의 추상화 계층이 불필요한 복잡도만 늘리기
 * 때문입니다(단순성 우선 원칙, structure.md 참고).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSession>();
    const token = request.cookies?.session as string | undefined;

    if (!token) throw new UnauthorizedException("ログインが必要です。");

    try {
      request.session = await this.authService.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException("セッションが無効です。再度ログインしてください。");
    }
  }
}
