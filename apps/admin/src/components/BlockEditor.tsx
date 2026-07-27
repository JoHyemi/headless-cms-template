"use client";

import { BLOCK_TYPE_LABELS, BLOCK_TYPES, emptyBlock, type Block } from "@cms/blocks";

type Props = {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
};

// 마케팅팀이 마크다운/HTML 문법 없이 다룰 수 있는 워드프레스 블록 에디터 스타일의
// 최소 구현. 문단/제목/목록/인용구/이미지 블록을 추가·삭제·순서 변경할 수 있습니다.
export function BlockEditor({ blocks, onChange }: Props) {
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

  function addBlock(type: Block["type"]) {
    onChange([...blocks, emptyBlock(type)]);
  }

  return (
    <div>
      {blocks.map((block, index) => (
        <div key={index} className="card" style={{ marginBottom: "0.75rem" }}>
          <div className="page-title-row" style={{ marginBottom: "0.75rem" }}>
            <span className="badge badge-category">{BLOCK_TYPE_LABELS[block.type]}</span>
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

          <BlockFields block={block} onChange={(next) => updateBlock(index, next)} />
        </div>
      ))}

      <div className="actions-row">
        {BLOCK_TYPES.map((type) => (
          <button key={type} type="button" className="btn" onClick={() => addBlock(type)}>
            + {BLOCK_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockFields({ block, onChange }: { block: Block; onChange: (block: Block) => void }) {
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
          <input
            type="text"
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="画像URL（https://... のみ使用できます）"
            style={{ marginBottom: "0.5rem" }}
          />
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
  }
}
