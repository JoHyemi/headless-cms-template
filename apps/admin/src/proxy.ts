import { NextRequest, NextResponse } from "next/server";

// クッキーの有無だけを軽く確認します。実際の署名/有効期限の検証はAPIリクエストのたびに
// apps/apiのJwtAuthGuardが行うため、JWTの秘密鍵をadminアプリ側に持ち出す必要がありません。
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("session");
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    if (hasSession) return NextResponse.redirect(new URL("/posts", request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|icon.svg).*)"],
};
