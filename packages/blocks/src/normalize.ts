import type { Block } from "./types";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** http(s) 또는 사이트 내부 경로만 허용합니다. javascript: 등 위험한 스킴을 막기 위함입니다. */
function isSafeImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}

/** 값이 Block 타입의 형태(shape)를 갖췄는지만 검사합니다. 빈 문자열 등 "내용 없음"은 허용하고,
 *  실질적인 내용이 있는지는 hasContent()에서 별도로 판단합니다. */
export function isBlock(value: unknown): value is Block {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  switch (v.type) {
    case "paragraph":
      return isString(v.text);
    case "heading":
      return (v.level === 2 || v.level === 3) && isString(v.text);
    case "list":
      return (
        (v.style === "ordered" || v.style === "unordered") &&
        Array.isArray(v.items) &&
        v.items.every((item) => typeof item === "string")
      );
    case "quote":
      return isString(v.text) && (v.cite === undefined || isString(v.cite));
    case "image":
      return isString(v.url) && isString(v.alt) && (v.caption === undefined || isString(v.caption));
    default:
      return false;
  }
}

export function isBlockArray(value: unknown): value is Block[] {
  return Array.isArray(value) && value.every(isBlock);
}

/** 블록에 실질적인 내용이 있는지 확인합니다. 이미지의 경우 안전하지 않은 URL(예: javascript:)은
 *  내용이 없는 것으로 취급되어 저장 시 제거됩니다. */
export function hasContent(block: Block): boolean {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return block.text.trim().length > 0;
    case "list":
      return block.items.some((item) => item.trim().length > 0);
    case "image": {
      const url = block.url.trim();
      return url.length > 0 && isSafeImageUrl(url);
    }
  }
}

/** 저장/응답 전에 각 블록의 공백을 정리하고, 실질적인 내용이 없는 블록은 제거합니다. */
export function normalizeBlocks(blocks: Block[]): Block[] {
  return blocks
    .map((block): Block => {
      switch (block.type) {
        case "paragraph":
        case "heading":
          return { ...block, text: block.text.trim() };
        case "quote":
          return { ...block, text: block.text.trim(), cite: block.cite?.trim() || undefined };
        case "list":
          return { ...block, items: block.items.map((item) => item.trim()).filter(Boolean) };
        case "image":
          return {
            ...block,
            url: block.url.trim(),
            alt: block.alt.trim(),
            caption: block.caption?.trim() || undefined,
          };
      }
    })
    .filter(hasContent);
}
