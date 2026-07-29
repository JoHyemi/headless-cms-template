// ブロックエディタのコンテンツモデル。Postのcontentカラム(Postgres Json)にはこのBlock[]をそのまま保存します。
// 自由形式のHTML/Markdownの代わりに決められたブロックタイプのみを許可し、保存段階から任意のタグが
// 紛れ込めないようにしています(本文テキストは常にエスケープされてレンダリングされます)。

export type ParagraphBlock = { type: "paragraph"; text: string };
export type HeadingBlock = { type: "heading"; level: 2 | 3; text: string };
export type ListBlock = { type: "list"; style: "ordered" | "unordered"; items: string[] };
export type QuoteBlock = { type: "quote"; text: string; cite?: string };
export type ImageBlock = { type: "image"; url: string; alt: string; caption?: string };

export type GalleryImageItem = { url: string; alt: string; caption?: string };
export type GalleryBlock = { type: "gallery"; images: GalleryImageItem[] };

// カスタムブロック(ACFのフィールドグループに相当)。管理画面でフィールド構成(FieldDef[])だけを
// 定義でき、そのフィールドをどんな見た目で描画するかは開発者がBlockRenderer/blocksToHtmlの
// カスタムレンダラーとして別途登録する(未登録の場合はラベル:値のリストとして安全に表示される)。
// これにより「自由なHTMLテンプレートを保存して差し込む」方式(=保存段階でのXSSの温床)を避けている。
export type FieldType = "text" | "textarea" | "number" | "boolean" | "url" | "image";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
};

export type FieldValue = string | number | boolean;

export type CustomBlock = {
  type: "custom";
  blockType: string; // BlockTypeのslug
  fields: Record<string, FieldValue>;
};

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | QuoteBlock
  | ImageBlock
  | GalleryBlock
  | CustomBlock;

// "custom"はBlockType(DBに保存された可変のカスタムブロック定義)ごとに動的に増えるため、
// 固定の追加ボタン一覧であるBLOCK_TYPESには含めない。
export const BLOCK_TYPES: Exclude<Block["type"], "custom">[] = [
  "paragraph",
  "heading",
  "list",
  "quote",
  "image",
  "gallery",
];

export const BLOCK_TYPE_LABELS: Record<Block["type"], string> = {
  paragraph: "段落",
  heading: "見出し",
  list: "リスト",
  quote: "引用",
  image: "画像",
  gallery: "画像ギャラリー",
  custom: "カスタムブロック",
};

export const FIELD_TYPES: FieldType[] = ["text", "textarea", "number", "boolean", "url", "image"];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "テキスト(1行)",
  textarea: "テキスト(複数行)",
  number: "数値",
  boolean: "はい/いいえ",
  url: "URL",
  image: "画像URL",
};

export function defaultFieldValue(type: FieldType): FieldValue {
  switch (type) {
    case "number":
      return 0;
    case "boolean":
      return false;
    default:
      return "";
  }
}

export function emptyCustomBlock(blockType: string, fields: FieldDef[]): CustomBlock {
  const values: Record<string, FieldValue> = {};
  for (const field of fields) values[field.key] = defaultFieldValue(field.type);
  return { type: "custom", blockType, fields: values };
}

export function emptyBlock(type: Exclude<Block["type"], "custom">): Block {
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
    case "gallery":
      return { type: "gallery", images: [{ url: "", alt: "", caption: "" }] };
  }
}

export function emptyGalleryImageItem(): GalleryImageItem {
  return { url: "", alt: "", caption: "" };
}

export function defaultBlocks(): Block[] {
  return [emptyBlock("paragraph")];
}
