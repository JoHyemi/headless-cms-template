export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** "use client"コンポーネントで使用: セッションクッキーをcredentials:"include"で一緒に送ります。 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

/** ファイルアップロード専用: FormDataを使う場合はContent-Typeをブラウザが自動で
 *  (boundaryを含めて)設定する必要があるため、apiFetchとは別に用意します。 */
export async function uploadFile(path: string, formData: FormData) {
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
}
