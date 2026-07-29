"use client";

import { BLOCK_TYPE_LABELS, BLOCK_TYPES, type Block } from "@cms/blocks";
import type { BlockTypeDTO } from "@/types/api";

type StandardType = Exclude<Block["type"], "custom">;

type Props = {
  blockTypes: BlockTypeDTO[];
  onSelect: (type: StandardType) => void;
  onSelectCustom: (blockType: BlockTypeDTO) => void;
  onClose: () => void;
};

const BLOCK_TYPE_ICONS: Record<StandardType, string> = {
  paragraph: "📝",
  heading: "🔠",
  list: "📋",
  quote: "💬",
  image: "🖼",
  gallery: "🖼🖼",
};

// 本文ブロックの追加ボタンをここに集約したモーダル。ブロックの種類(標準6種+カスタム)が
// 増えても、本文欄の下にボタンが横一列に増え続けて見づらくならないようにする。
export function BlockTypePickerModal({ blockTypes, onSelect, onSelectCustom, onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: "min(560px, 100%)", maxHeight: "80vh", overflowY: "auto", marginBottom: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="page-title-row">
          <h2 style={{ fontSize: "1.1rem" }}>ブロックを追加</h2>
          <button type="button" className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="btn"
              onClick={() => onSelect(type)}
              style={{ flexDirection: "column", gap: "0.4rem", padding: "1.1rem 0.75rem", height: "auto" }}
            >
              <span style={{ fontSize: "1.4rem" }}>{BLOCK_TYPE_ICONS[type]}</span>
              <span>{BLOCK_TYPE_LABELS[type]}</span>
            </button>
          ))}
          {blockTypes.map((blockType) => (
            <button
              key={blockType.id}
              type="button"
              className="btn"
              onClick={() => onSelectCustom(blockType)}
              style={{ flexDirection: "column", gap: "0.4rem", padding: "1.1rem 0.75rem", height: "auto" }}
            >
              <span style={{ fontSize: "1.4rem" }}>🧩</span>
              <span>{blockType.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
