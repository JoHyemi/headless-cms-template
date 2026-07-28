import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard, RequestWithSession } from "./jwt-auth.guard";

const COOKIE_NAME = "session";
const isProd = process.env.NODE_ENV === "production";
// 기본은 lax(동일 사이트 배포 기준). cloudflared 같은 터널로 admin/api를 서로 다른
// 도메인에 띄워 시연할 때만 COOKIE_SAME_SITE=none 으로 임시 전환합니다.
// SameSite=None은 브라우저 스펙상 Secure가 필수라 이 경우엔 HTTP(NODE_ENV=development)여도 secure를 강제합니다.
const cookieSameSite = (process.env.COOKIE_SAME_SITE as "lax" | "strict" | "none" | undefined) ?? "lax";
const cookieSecure = cookieSameSite === "none" ? true : isProd;

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const token = await this.authService.validateAndIssueToken(dto.email, dto.password);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: cookieSameSite,
      secure: cookieSecure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    return { ok: true };
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: RequestWithSession) {
    return { email: req.session?.email };
  }
}
