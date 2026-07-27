// 블록 에디터의 콘텐츠 모델. Post/Page의 content 컬럼(Postgres Json)에는 이 Block[]을 그대로 저장합니다.
// 자유 형식 HTML/Markdown 대신 정해진 블록 타입만 허용해, 저장 단계부터 임의 태그가
// 끼어들 수 없도록 합니다 (본문 텍스트는 항상 이스케이프되어 렌더링됩니다).

export type ParagraphBlock = { type: "paragraph"; text: string };
export type HeadingBlock = { type: "heading"; level: 2 | 3; text: string };
export type ListBlock = { type: "list"; style: "ordered" | "unordered"; items: string[] };
export type QuoteBlock = { type: "quote"; text: string; cite?: string };
export type ImageBlock = { type: "image"; url: string; alt: string; caption?: string };

export type Block = ParagraphBlock | HeadingBlock | ListBlock | QuoteBlock | ImageBlock;

export const BLOCK_TYPES: Block["type"][] = ["paragraph", "heading", "list", "quote", "image"];

export const BLOCK_TYPE_LABELS: Record<Block["type"], string> = {
  paragraph: "段落",
  heading: "見出し",
  list: "リスト",
  quote: "引用",
  image: "画像",
};

export function emptyBlock(type: Block["type"]): Block {
  switch (type) {
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "heading":
      return { type: "heading", level: 2, text: "" };
    case "list":
      return { type: "list", style: "unordered", items: [""] };
    case "quote":
      return { type: "quote", text: "", cite: "" };
    case "image":
      return { type: "image", url: "", alt: "", caption: "" };
  }
}

export function defaultBlocks(): Block[] {
  return [emptyBlock("paragraph")];
}
