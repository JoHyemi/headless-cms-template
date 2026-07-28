import type { Block } from "./types";
import { parseContent } from "./parse";
import { blocksToHtml } from "./html";

/** DBから読み込んだpost/page row(content: Json)をAPIレスポンス用DTOに変換します。
 *  contentは正規化されたブロック配列、contentHtmlはサーバーでレンダリングしたHTML文字列として返します。 */
export function toContentDTO<T extends { content: unknown }>(
  row: T
): Omit<T, "content"> & { content: Block[]; contentHtml: string } {
  const blocks = parseContent(row.content);
  return { ...row, content: blocks, contentHtml: blocksToHtml(blocks) };
}
