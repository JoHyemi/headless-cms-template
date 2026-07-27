const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** website는 전부 공개(비로그인) 데이터만 다루므로 쿠키 전달이 필요 없습니다. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
}
