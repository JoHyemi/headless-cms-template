import type { Block } from "./types";

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

/**
 * ブロック配列をHTML文字列に変換します。ヘッドレスAPI(contentHtml)で外部の消費者に
 * 提供するための用途で、admin/website自身の画面はBlockRendererで直接JSXを描画してこの
 * 関数は経由しません。すべてのテキストはescapeHtmlを通るため、ブロックの中に<script>のような
 * 文字列を入れてもタグとして解釈されず、文字そのまま出力されます。
 */
export function blocksToHtml(blocks: Block[]): string {
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
      }
    })
    .join("\n");
}
