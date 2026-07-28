import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { AuthService, SessionPayload } from "./auth.service";

export type RequestWithSession = Request & { session?: SessionPayload };

/**
 * セッションクッキー(httpOnly JWT)を検証するガード。Passportを使わず直接実装した理由は、
 * 戦略(strategy)が1つしかないためPassportの抽象化レイヤーが不要な複雑さを増やすだけ
 * だからです(シンプルさ優先の原則、structure.md参照)。
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
