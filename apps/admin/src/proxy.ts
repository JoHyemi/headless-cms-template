import { NextRequest, NextResponse } from "next/server";

// 쿠키 존재 여부만 값싸게 확인합니다. 실제 서명/만료 검증은 매 API 요청마다
// apps/api의 JwtAuthGuard가 수행하므로, JWT 비밀키는 admin 앱으로 나올 필요가 없습니다.
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
