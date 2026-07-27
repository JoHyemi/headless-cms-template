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
 * 블록 배열을 HTML 문자열로 변환합니다. 헤드리스 API(contentHtml)에서 외부 소비자에게
 * 제공하기 위한 용도이며, admin/website 자신의 화면은 BlockRenderer로 직접 JSX를 그려 이
 * 함수를 거치지 않습니다. 모든 텍스트는 escapeHtml을 거치므로 블록 안에 <script> 같은
 * 문자열을 넣어도 태그로 해석되지 않고 문자 그대로 출력됩니다.
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
