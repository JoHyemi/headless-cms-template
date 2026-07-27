import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

export type SessionPayload = { sub: string; email: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async validateAndIssueToken(email: string, password: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("メールアドレスまたはパスワードが正しくありません。");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("メールアドレスまたはパスワードが正しくありません。");

    const payload: SessionPayload = { sub: user.id, email: user.email };
    return this.jwt.signAsync(payload);
  }

  async verify(token: string): Promise<SessionPayload> {
    return this.jwt.verifyAsync<SessionPayload>(token);
  }
}
