/** タイトルからURLで使うslugを生成します。日本語などのUnicode文字はそのまま残し、
 *  空白はハイフンに、URLに不適切な特殊文字だけを除去します。 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 本文テキストから要約(excerpt)を自動生成します。 */
export function makeExcerpt(content: string, length = 120): string {
  const plain = content.replace(/\s+/g, " ").trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}
