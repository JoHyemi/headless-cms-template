"use client";

import {
  BLOCK_TYPE_LABELS,
  BLOCK_TYPES,
  emptyBlock,
  emptyCustomBlock,
  type Block,
  type FieldDef,
  type FieldValue,
} from "@cms/blocks";
import { ImageUrlField } from "@/components/ImageUrlField";
import type { BlockTypeDTO } from "@/types/api";

type Props = {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  blockTypes?: BlockTypeDTO[];
};

// マーケティングチームがMarkdown/HTMLの文法を知らなくても扱える、WordPressのブロックエディタ
// スタイルの最小実装。段落/見出し/リスト/引用/画像ブロックの追加・削除・並べ替えができます。
// blockTypesに渡されたカスタムブロック(ACFのフィールドグループに相当)も同じ要領で追加できます —
// フィールドの構成だけをここで扱い、見た目はBlockRenderer側の登録済みレンダラーが担当します。
export function BlockEditor({ blocks, onChange, blockTypes = [] }: Props) {
  function updateBlock(index: number, next: Block) {
    onChange(blocks.map((b, i) => (i === index ? next : b)));
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addBlock(type: Exclude<Block["type"], "custom">) {
    onChange([...blocks, emptyBlock(type)]);
  }

  function addCustomBlock(blockType: BlockTypeDTO) {
    onChange([...blocks, emptyCustomBlock(blockType.slug, blockType.fields)]);
  }

  return (
    <div>
      {blocks.map((block, index) => (
        <div key={index} className="card" style={{ marginBottom: "0.75rem" }}>
          <div className="page-title-row" style={{ marginBottom: "0.75rem" }}>
            <span className="badge badge-category">
              {block.type === "custom"
                ? (blockTypes.find((bt) => bt.slug === block.blockType)?.name ?? block.blockType)
                : BLOCK_TYPE_LABELS[block.type]}
            </span>
            <div className="actions-row">
              <button
                type="button"
                className="btn"
                onClick={() => moveBlock(index, -1)}
                disabled={index === 0}
                aria-label="上へ移動"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => moveBlock(index, 1)}
                disabled={index === blocks.length - 1}
                aria-label="下へ移動"
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => removeBlock(index)}
                disabled={blocks.length === 1}
              >
                削除
              </button>
            </div>
          </div>

          <BlockFields
            block={block}
            blockTypes={blockTypes}
            onChange={(next) => updateBlock(index, next)}
          />
        </div>
      ))}

      <div className="actions-row">
        {BLOCK_TYPES.map((type) => (
          <button key={type} type="button" className="btn" onClick={() => addBlock(type)}>
            + {BLOCK_TYPE_LABELS[type]}
          </button>
        ))}
        {blockTypes.map((blockType) => (
          <button
            key={blockType.id}
            type="button"
            className="btn"
            onClick={() => addCustomBlock(blockType)}
          >
            + {blockType.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockFields({
  block,
  blockTypes,
  onChange,
}: {
  block: Block;
  blockTypes: BlockTypeDTO[];
  onChange: (block: Block) => void;
}) {
  switch (block.type) {
    case "paragraph":
      return (
        <textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="段落の内容を入力してください"
          style={{ minHeight: "100px" }}
        />
      );

    case "heading":
      return (
        <div className="actions-row">
          <select
            value={block.level}
            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}
            style={{ maxWidth: "90px" }}
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            type="text"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="見出しを入力してください"
            style={{ flex: 1, minWidth: "160px" }}
          />
        </div>
      );

    case "list":
      return (
        <>
          <select
            value={block.style}
            onChange={(e) =>
              onChange({ ...block, style: e.target.value as "ordered" | "unordered" })
            }
            style={{ maxWidth: "160px", marginBottom: "0.5rem" }}
          >
            <option value="unordered">箇条書きリスト</option>
            <option value="ordered">番号付きリスト</option>
          </select>
          <textarea
            value={block.items.join("\n")}
            onChange={(e) => onChange({ ...block, items: e.target.value.split("\n") })}
            placeholder="項目を1行に一つずつ入力してください"
            style={{ minHeight: "100px" }}
          />
        </>
      );

    case "quote":
      return (
        <>
          <textarea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="引用内容を入力してください"
            style={{ minHeight: "80px", marginBottom: "0.5rem" }}
          />
          <input
            type="text"
            value={block.cite ?? ""}
            onChange={(e) => onChange({ ...block, cite: e.target.value })}
            placeholder="出典（任意）"
          />
        </>
      );

    case "image":
      return (
        <>
          <div style={{ marginBottom: "0.5rem" }}>
            <ImageUrlField
              value={block.url}
              onChange={(url) => onChange({ ...block, url })}
              onPick={({ url, alt, caption }) => onChange({ ...block, url, alt, caption })}
            />
          </div>
          <input
            type="text"
            value={block.alt}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            placeholder="代替テキスト（alt）"
            style={{ marginBottom: "0.5rem" }}
          />
          <input
            type="text"
            value={block.caption ?? ""}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="キャプション（任意）"
          />
        </>
      );

    case "custom": {
      const customBlock = block;
      const def = blockTypes.find((bt) => bt.slug === customBlock.blockType);
      if (!def) {
        return (
          <p className="error-text">
            このブロックタイプ（{customBlock.blockType}）の定義が見つかりません。カスタムブロック管理画面で削除された可能性があります。
          </p>
        );
      }

      function updateFieldValue(key: string, value: FieldValue) {
        onChange({ ...customBlock, fields: { ...customBlock.fields, [key]: value } });
      }

      return (
        <>
          {def.fields.map((field) => (
            <CustomFieldInput
              key={field.key}
              field={field}
              value={customBlock.fields[field.key]}
              onChange={(value) => updateFieldValue(field.key, value)}
            />
          ))}
        </>
      );
    }
  }
}

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}) {
  const label = `${field.label}${field.required ? " *" : ""}`;

  switch (field.type) {
    case "textarea":
      return (
        <div className="field">
          <label>{label}</label>
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ minHeight: "80px" }}
          />
        </div>
      );

    case "number":
      return (
        <div className="field">
          <label>{label}</label>
          <input
            type="number"
            value={typeof value === "number" ? value : 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );

    case "boolean":
      return (
        <label className="btn" style={{ cursor: "pointer", marginBottom: "0.75rem" }}>
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            style={{ marginRight: "0.4rem" }}
          />
          {label}
        </label>
      );

    case "url":
      return (
        <div className="field">
          <label>{label}</label>
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
          />
        </div>
      );

    case "image":
      return (
        <div className="field">
          <label>{label}</label>
          <ImageUrlField
            value={typeof value === "string" ? value : ""}
            onChange={(url) => onChange(url)}
          />
        </div>
      );

    case "text":
    default:
      return (
        <div className="field">
          <label>{label}</label>
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}
