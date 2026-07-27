/** 제목으로부터 URL에 쓸 slug를 생성합니다. 한글/일본어 등 유니코드 문자는 그대로 두고,
 *  공백은 하이픈으로, URL에 부적절한 특수문자만 제거합니다. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 본문 텍스트에서 요약(excerpt)을 자동 생성합니다. */
export function makeExcerpt(content: string, length = 120): string {
  const plain = content.replace(/\s+/g, " ").trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}
