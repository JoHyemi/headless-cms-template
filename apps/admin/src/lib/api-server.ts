import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Server Componentで使用: ブラウザのセッションクッキーをAPIにそのまま転送して認証済みリクエストを送ります。 */
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
