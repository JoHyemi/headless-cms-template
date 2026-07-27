export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** "use client" 컴포넌트에서 사용: 세션 쿠키를 credentials:"include"로 함께 보냅니다. */
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

/** 파일 업로드 전용: FormData를 쓸 때는 Content-Type을 브라우저가 자동으로
 *  (boundary 포함) 설정해야 하므로 apiFetch와 별도로 둡니다. */
export async function uploadFile(path: string, formData: FormData) {
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
}
