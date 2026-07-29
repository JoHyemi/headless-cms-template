"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  BLOCK_TYPE_LABELS,
  emptyBlock,
  emptyCustomBlock,
  emptyGalleryImageItem,
  type Block,
  type FieldDef,
  type FieldValue,
  type GalleryBlock,
  type GalleryImageItem,
} from "@cms/blocks";
import { BlockTypePickerModal } from "@/components/BlockTypePickerModal";
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
  // ドラッグ中のブロックのインデックスと、現在ドラッグがかかっている(ドロップ先候補の)インデックス。
  // ドロップ先の視覚的なハイライトにdragOverIndexを使う。
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // HTML5のネイティブdraggable属性(dragstart/dragover/drop)は、ブラウザ側のドラッグセッション
  // 認識に依存するため、環境によってはdropまで到達せずキャンセルされることがある。
  // その代わりにpointerdown/pointermove/pointerupだけで完結する自前の並べ替えを実装している。
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragFromRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

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

  function reorderBlock(from: number, to: number) {
    if (from === to) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function startDrag(index: number) {
    dragFromRef.current = index;
    dragOverRef.current = index;
    setDragIndex(index);
    setDragOverIndex(index);

    function onPointerMove(e: PointerEvent) {
      const y = e.clientY;
      for (let i = 0; i < itemRefs.current.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          if (dragOverRef.current !== i) {
            dragOverRef.current = i;
            setDragOverIndex(i);
          }
          break;
        }
      }
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      const from = dragFromRef.current;
      const to = dragOverRef.current;
      dragFromRef.current = null;
      dragOverRef.current = null;
      setDragIndex(null);
      setDragOverIndex(null);
      if (from !== null && to !== null) reorderBlock(from, to);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function addBlock(type: Exclude<Block["type"], "custom">) {
    onChange([...blocks, emptyBlock(type)]);
    setPickerOpen(false);
  }

  function addCustomBlock(blockType: BlockTypeDTO) {
    onChange([...blocks, emptyCustomBlock(blockType.slug, blockType.fields)]);
    setPickerOpen(false);
  }

  return (
    <div>
      <div className="actions-row" style={{ marginBottom: "0.75rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => setPickerOpen(true)}>
          + ブロックを追加
        </button>
      </div>

      {pickerOpen && (
        <BlockTypePickerModal
          blockTypes={blockTypes}
          onSelect={addBlock}
          onSelectCustom={addCustomBlock}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {blocks.map((block, index) => (
        <div
          key={index}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          className="card"
          style={{
            marginBottom: "0.75rem",
            outline:
              dragOverIndex === index && dragIndex !== null && dragIndex !== index
                ? "2px solid var(--accent)"
                : undefined,
          }}
        >
          <div className="page-title-row" style={{ marginBottom: "0.75rem" }}>
            <div className="actions-row">
              <span
                onPointerDown={(e: ReactPointerEvent) => {
                  e.preventDefault();
                  startDrag(index);
                }}
                aria-label="ドラッグして並べ替え"
                title="ドラッグして並べ替え"
                style={{
                  cursor: dragIndex === index ? "grabbing" : "grab",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                  color: "var(--muted)",
                  userSelect: "none",
                  touchAction: "none",
                }}
              >
                ⠿
              </span>
              <span className="badge badge-category">
                {block.type === "custom"
                  ? (blockTypes.find((bt) => bt.slug === block.blockType)?.name ?? block.blockType)
                  : BLOCK_TYPE_LABELS[block.type]}
              </span>
            </div>
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

    case "gallery":
      return <GalleryBlockFields block={block} onChange={onChange} />;

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

// 画像ギャラリー内の画像も、本文ブロックと同じ要領でドラッグハンドル(⠿)による並べ替えに対応します。
function GalleryBlockFields({
  block,
  onChange,
}: {
  block: GalleryBlock;
  onChange: (block: Block) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragFromRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  function updateImage(i: number, next: GalleryImageItem) {
    onChange({ ...block, images: block.images.map((img, idx) => (idx === i ? next : img)) });
  }

  function addImage() {
    onChange({ ...block, images: [...block.images, emptyGalleryImageItem()] });
  }

  function removeImage(i: number) {
    onChange({ ...block, images: block.images.filter((_, idx) => idx !== i) });
  }

  function moveImage(i: number, direction: -1 | 1) {
    const target = i + direction;
    if (target < 0 || target >= block.images.length) return;
    const next = [...block.images];
    [next[i], next[target]] = [next[target], next[i]];
    onChange({ ...block, images: next });
  }

  function reorderImage(from: number, to: number) {
    if (from === to) return;
    const next = [...block.images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ ...block, images: next });
  }

  function startDrag(index: number) {
    dragFromRef.current = index;
    dragOverRef.current = index;
    setDragIndex(index);
    setDragOverIndex(index);

    function onPointerMove(e: PointerEvent) {
      const y = e.clientY;
      for (let i = 0; i < itemRefs.current.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          if (dragOverRef.current !== i) {
            dragOverRef.current = i;
            setDragOverIndex(i);
          }
          break;
        }
      }
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      const from = dragFromRef.current;
      const to = dragOverRef.current;
      dragFromRef.current = null;
      dragOverRef.current = null;
      setDragIndex(null);
      setDragOverIndex(null);
      if (from !== null && to !== null) reorderImage(from, to);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <>
      {block.images.map((image, i) => (
        <div
          key={i}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.75rem",
            marginBottom: "0.5rem",
            outline:
              dragOverIndex === i && dragIndex !== null && dragIndex !== i
                ? "2px solid var(--accent)"
                : undefined,
          }}
        >
          <div className="actions-row" style={{ marginBottom: "0.5rem", justifyContent: "space-between" }}>
            <span
              onPointerDown={(e: ReactPointerEvent) => {
                e.preventDefault();
                startDrag(i);
              }}
              aria-label="ドラッグして並べ替え"
              title="ドラッグして並べ替え"
              style={{
                cursor: dragIndex === i ? "grabbing" : "grab",
                fontSize: "1.1rem",
                lineHeight: 1,
                color: "var(--muted)",
                userSelect: "none",
                touchAction: "none",
              }}
            >
              ⠿
            </span>
            <div className="actions-row">
              <button
                type="button"
                className="btn"
                onClick={() => moveImage(i, -1)}
                disabled={i === 0}
                aria-label="上へ移動"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => moveImage(i, 1)}
                disabled={i === block.images.length - 1}
                aria-label="下へ移動"
              >
                ↓
              </button>
              <button type="button" className="btn btn-danger" onClick={() => removeImage(i)}>
                削除
              </button>
            </div>
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <ImageUrlField
              value={image.url}
              onChange={(url) => updateImage(i, { ...image, url })}
              onPick={({ url, alt, caption }) => updateImage(i, { ...image, url, alt, caption })}
            />
          </div>
          <input
            type="text"
            value={image.alt}
            onChange={(e) => updateImage(i, { ...image, alt: e.target.value })}
            placeholder="代替テキスト（alt）"
            style={{ marginBottom: "0.5rem" }}
          />
          <input
            type="text"
            value={image.caption ?? ""}
            onChange={(e) => updateImage(i, { ...image, caption: e.target.value })}
            placeholder="キャプション（任意）"
          />
        </div>
      ))}
      <button type="button" className="btn" onClick={addImage}>
        + 画像を追加
      </button>
    </>
  );
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
