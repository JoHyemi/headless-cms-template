import type { Block } from "./types";
import { parseContent } from "./parse";
import { blocksToHtml } from "./html";

/** DB에서 읽은 post/page row(content: Json)를 API 응답용 DTO로 변환합니다.
 *  content는 정규화된 블록 배열로, contentHtml은 서버에서 렌더링한 HTML 문자열로 내려줍니다. */
export function toContentDTO<T extends { content: unknown }>(
  row: T
): Omit<T, "content"> & { content: Block[]; contentHtml: string } {
  const blocks = parseContent(row.content);
  return { ...row, content: blocks, contentHtml: blocksToHtml(blocks) };
}
