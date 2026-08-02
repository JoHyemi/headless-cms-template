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
  // /api-proxyはAPIへのリバースプロキシ(next.config.tsのrewrites、deploy/local-demo.sh専用)。
  // ページ遷移ではないため、ここでのクッキー有無チェックの対象外にする — 対象に含めると、
  // ログイン前にPOSTするログインリクエスト自身までここで/loginへリダイレクトされてしまい、
  // ログインが不可能になる。実際の認可はapps/apiのJwtAuthGuardが個々のエンドポイントで行う。
  matcher: ["/((?!_next|favicon.ico|icon.svg|api-proxy).*)"],
};
