import type { Block } from "./types";
import { parseContent } from "./parse";
import { blocksToHtml } from "./html";
import { PRESET_CUSTOM_HTML_RENDERERS } from "./presets";

/** DBから読み込んだpost/page row(content: Json)をAPIレスポンス用DTOに変換します。
 *  contentは正規化されたブロック配列、contentHtmlはサーバーでレンダリングしたHTML文字列として返します。
 *  登録済みのカスタムブロック(PRESET_CUSTOM_HTML_RENDERERS)はそのデザインでHTML化され、
 *  未登録のブロックタイプはラベル:値のリストとして安全にフォールバックします。 */
export function toContentDTO<T extends { content: unknown }>(
  row: T
): Omit<T, "content"> & { content: Block[]; contentHtml: string } {
  const blocks = parseContent(row.content);
  return { ...row, content: blocks, contentHtml: blocksToHtml(blocks, PRESET_CUSTOM_HTML_RENDERERS) };
}
