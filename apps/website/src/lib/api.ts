export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** websiteは公開(非ログイン)データのみを扱うため、クッキーを渡す必要がありません。 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
}
