import { FIELD_TYPES, type Block, type FieldDef } from "./types";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** http(s)またはサイト内部パスのみ許可します。javascript:のような危険なスキームを防ぐためです
 *  (aタグのhrefにそのまま使うと、クリック時にスクリプトが実行されてしまいます)。 */
export function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith("/");
}

/** カスタムブロックのfields定義(FieldDef)1件の形を検査します。 */
export function isFieldDef(value: unknown): value is FieldDef {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isString(v.key) &&
    v.key.trim().length > 0 &&
    isString(v.label) &&
    v.label.trim().length > 0 &&
    FIELD_TYPES.includes(v.type as (typeof FIELD_TYPES)[number]) &&
    (v.required === undefined || typeof v.required === "boolean")
  );
}

/** BlockType.fieldsに保存するFieldDef配列全体を検査します。空配列は意味のあるブロックタイプに
 *  ならないため許可しません。 */
export function isFieldDefArray(value: unknown): value is FieldDef[] {
  return Array.isArray(value) && value.length > 0 && value.every(isFieldDef);
}

/** 値がBlock型の形(shape)を満たしているかだけを検査します。空文字列などの「内容なし」は許容し、
 *  実質的な内容があるかどうかはhasContent()で別途判断します。 */
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
    case "custom":
      return (
        isString(v.blockType) &&
        v.blockType.trim().length > 0 &&
        typeof v.fields === "object" &&
        v.fields !== null &&
        !Array.isArray(v.fields) &&
        Object.values(v.fields as Record<string, unknown>).every(
          (fieldValue) =>
            typeof fieldValue === "string" ||
            typeof fieldValue === "number" ||
            typeof fieldValue === "boolean"
        )
      );
    default:
      return false;
  }
}

export function isBlockArray(value: unknown): value is Block[] {
  return Array.isArray(value) && value.every(isBlock);
}

/** ブロックに実質的な内容があるかを確認します。画像の場合、安全でないURL(例: javascript:)は
 *  内容がないものとして扱われ、保存時に除去されます。 */
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
      return url.length > 0 && isSafeUrl(url);
    }
    case "custom":
      return Object.values(block.fields).some((value) =>
        typeof value === "string" ? value.trim().length > 0 : true
      );
  }
}

/** 保存/レスポンス前に各ブロックの空白を整理し、実質的な内容がないブロックは除去します。 */
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
        case "custom": {
          const fields = Object.fromEntries(
            Object.entries(block.fields).map(([key, value]) => [
              key,
              typeof value === "string" ? value.trim() : value,
            ])
          );
          return { ...block, fields };
        }
      }
    })
    .filter(hasContent);
}
