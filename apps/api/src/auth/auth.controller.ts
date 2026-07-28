import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard, RequestWithSession } from "./jwt-auth.guard";

const COOKIE_NAME = "session";
const isProd = process.env.NODE_ENV === "production";
// デフォルトはlax(同一サイトへのデプロイ前提)。cloudflaredのようなトンネルでadmin/apiを
// 別ドメインに立ててデモする場合だけ、COOKIE_SAME_SITE=noneに一時的に切り替えます。
// SameSite=Noneはブラウザの仕様上Secureが必須なため、この場合はHTTP(NODE_ENV=development)でもsecureを強制します。
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
