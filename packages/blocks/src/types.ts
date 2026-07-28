// ブロックエディタのコンテンツモデル。Post/Pageのcontentカラム(Postgres Json)にはこのBlock[]をそのまま保存します。
// 自由形式のHTML/Markdownの代わりに決められたブロックタイプのみを許可し、保存段階から任意のタグが
// 紛れ込めないようにしています(本文テキストは常にエスケープされてレンダリングされます)。

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
