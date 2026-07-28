"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FIELD_TYPE_LABELS, FIELD_TYPES, type FieldDef, type FieldType } from "@cms/blocks";
import { apiFetch } from "@/lib/api-client";
import type { BlockTypeDTO } from "@/types/api";

type Props = {
  mode: "create" | "edit";
  blockType?: BlockTypeDTO;
};

function emptyField(): FieldDef {
  return { key: "", label: "", type: "text" };
}

// カスタムブロックの定義フォーム。ACFの「フィールドグループ」に相当し、ここで決めるのは
// フィールドの構成(名前・ラベル・型)だけです。実際のHTML/デザインは開発者が
// BlockRenderer/blocksToHtmlにこのブロックタイプのslug用のレンダラーを登録して描画します
// (未登録の間はラベル:値のリストとして安全に表示されます)。
export function BlockTypeForm({ mode, blockType }: Props) {
  const router = useRouter();
  const [name, setName] = useState(blockType?.name ?? "");
  const [slug, setSlug] = useState(blockType?.slug ?? "");
  const [fields, setFields] = useState<FieldDef[]>(
    blockType?.fields && blockType.fields.length > 0 ? blockType.fields : [emptyField()]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(index: number, next: FieldDef) {
    setFields((prev) => prev.map((f, i) => (i === index ? next : f)));
  }

  function addField() {
    setFields((prev) => [...prev, emptyField()]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanedFields = fields
      .map((f) => ({ ...f, key: f.key.trim(), label: f.label.trim() }))
      .filter((f) => f.key && f.label);

    if (cleanedFields.length === 0) {
      setError("フィールドを1つ以上入力してください（キーとラベルは必須です）。");
      return;
    }

    const keys = cleanedFields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      setError("フィールドのキーが重複しています。キーはブロック内で一意である必要があります。");
      return;
    }

    setSubmitting(true);

    try {
      const res = await apiFetch(
        mode === "create" ? "/block-types" : `/block-types/${blockType!.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify({
            name,
            fields: cleanedFields,
            ...(mode === "edit" ? { slug } : {}),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました。");
        setSubmitting(false);
        return;
      }

      router.push("/block-types");
      router.refresh();
    } catch {
      setError("ネットワークエラーにより保存に失敗しました。");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: "1.5rem" }}>
      {error && <p className="error-text">{error}</p>}

      <div className="field">
        <label htmlFor="bt-name">ブロック名</label>
        <input
          id="bt-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：お知らせバナー"
          required
        />
      </div>

      {mode === "edit" && (
        <div className="field">
          <label htmlFor="bt-slug">slug</label>
          <input
            id="bt-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="block-type-slug"
            required
          />
          <span className="hint">
            このslugをBlockRenderer/blocksToHtmlのカスタムレンダラー登録時のキーとして使います。
          </span>
        </div>
      )}

      <div className="field">
        <label>フィールド</label>
        {fields.map((field, index) => (
          <div
            key={index}
            className="actions-row"
            style={{ marginBottom: "0.5rem", alignItems: "center" }}
          >
            <input
              type="text"
              value={field.key}
              onChange={(e) => updateField(index, { ...field, key: e.target.value })}
              placeholder="キー（例：buttonText）"
              style={{ flex: 1, minWidth: "140px" }}
            />
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(index, { ...field, label: e.target.value })}
              placeholder="ラベル（例：ボタンの文言）"
              style={{ flex: 1, minWidth: "140px" }}
            />
            <select
              value={field.type}
              onChange={(e) => updateField(index, { ...field, type: e.target.value as FieldType })}
              style={{ maxWidth: "160px" }}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {FIELD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <label className="btn" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={field.required ?? false}
                onChange={(e) => updateField(index, { ...field, required: e.target.checked })}
                style={{ marginRight: "0.4rem" }}
              />
              必須
            </label>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeField(index)}
              disabled={fields.length === 1}
            >
              削除
            </button>
          </div>
        ))}
        <button type="button" className="btn" onClick={addField}>
          + フィールド追加
        </button>
      </div>

      <div className="actions-row">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "保存中…" : mode === "create" ? "作成" : "更新を保存"}
        </button>
      </div>
    </form>
  );
}
