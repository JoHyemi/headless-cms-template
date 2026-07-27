import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Server Component에서 사용: 브라우저의 세션 쿠키를 API로 그대로 전달해 인증된 요청을 보냅니다. */
export async function serverApiFetch(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies();
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
      cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });
}
