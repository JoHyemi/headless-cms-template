import type { Block, FieldValue } from "./types";

export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "paragraph":
        case "heading":
        case "quote":
          return block.text;
        case "list":
          return block.items.join(" ");
        case "image":
          return block.caption ?? block.alt;
        case "custom":
          return Object.values(block.fields).join(" ");
      }
    })
    .join(" ");
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** カスタムブロックをHTML文字列で描画する関数。ブロックタイプのslugをキーに登録する。 */
export type CustomBlockHtmlRenderers = Record<string, (fields: Record<string, FieldValue>) => string>;

/** 対応するレンダラーが登録されていないカスタムブロックのフォールバック表示。
 *  すべての値をescapeHtmlに通した上でラベル:値のリストとして出力するため、
 *  未知のブロックタイプでも安全に(コードとして実行されずに)表示できる。 */
function renderCustomBlockFallback(block: { blockType: string; fields: Record<string, FieldValue> }): string {
  const rows = Object.entries(block.fields)
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(value))}</dd>`)
    .join("");
  return `<dl class="custom-block" data-block-type="${escapeHtml(block.blockType)}">${rows}</dl>`;
}

/**
 * ブロック配列をHTML文字列に変換します。ヘッドレスAPI(contentHtml)で外部の消費者に
 * 提供するための用途で、admin/website自身の画面はBlockRendererで直接JSXを描画してこの
 * 関数は経由しません。すべてのテキストはescapeHtmlを通るため、ブロックの中に<script>のような
 * 文字列を入れてもタグとして解釈されず、文字そのまま出力されます。
 *
 * customRenderersはブロックタイプのslugごとにHTML文字列を組み立てる関数を登録するための
 * 拡張ポイント。未登録のslugはrenderCustomBlockFallback(ラベル:値のリスト)で表示される。
 */
export function blocksToHtml(blocks: Block[], customRenderers: CustomBlockHtmlRenderers = {}): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "paragraph":
          return `<p>${escapeHtml(block.text)}</p>`;
        case "heading":
          return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
        case "list": {
          const tag = block.style === "ordered" ? "ol" : "ul";
          const items = block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
          return `<${tag}>${items}</${tag}>`;
        }
        case "quote": {
          const cite = block.cite ? `<cite>${escapeHtml(block.cite)}</cite>` : "";
          return `<blockquote><p>${escapeHtml(block.text)}</p>${cite}</blockquote>`;
        }
        case "image": {
          const caption = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "";
          return `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" />${caption}</figure>`;
        }
        case "custom": {
          const renderer = customRenderers[block.blockType];
          return renderer ? renderer(block.fields) : renderCustomBlockFallback(block);
        }
      }
    })
    .join("\n");
}
