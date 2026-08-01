"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FIELD_TYPE_LABELS, FIELD_TYPES, type FieldDef, type FieldType } from "@cms/blocks";
import { apiFetch } from "@/lib/api-client";
import type { PostTypeDTO } from "@/types/api";

type Props = {
  mode: "create" | "edit";
  postType?: PostTypeDTO;
};

function emptyField(): FieldDef {
  return { key: "", label: "", type: "text" };
}

// カスタム投稿タイプの定義フォーム。WordPressのCustom Post Typeに相当し、ここで決めるのは
// フィールドの構成(名前・ラベル・型)だけ。実データ(エントリー)はこの定義を保存した後、
// /post-types/[typeSlug]/entries の画面から作成する(BlockTypeFormとほぼ同じ形)。
export function PostTypeForm({ mode, postType }: Props) {
  const router = useRouter();
  const [name, setName] = useState(postType?.name ?? "");
  const [slug, setSlug] = useState(postType?.slug ?? "");
  const [fields, setFields] = useState<FieldDef[]>(
    postType?.fields && postType.fields.length > 0 ? postType.fields : [emptyField()]
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
      setError("フィールドのキーが重複しています。キーは投稿タイプ内で一意である必要があります。");
      return;
    }

    setSubmitting(true);

    try {
      const res = await apiFetch(mode === "create" ? "/post-types" : `/post-types/${postType!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify({
          name,
          fields: cleanedFields,
          ...(slug.trim() ? { slug } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました。");
        setSubmitting(false);
        return;
      }

      router.push("/post-types");
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
        <label htmlFor="pt-name">投稿タイプ名</label>
        <input
          id="pt-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：商品"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="pt-slug">slug（任意）</label>
        <input
          id="pt-slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="例：product（空欄なら投稿タイプ名から自動生成）"
        />
        <span className="hint">
          このslugがAPIのパス（例：GET /post-types/{"{"}slug{"}"}）に使われます。
        </span>
      </div>

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
              placeholder="キー（例：price）"
              style={{ flex: 1, minWidth: "140px" }}
            />
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(index, { ...field, label: e.target.value })}
              placeholder="ラベル（例：価格）"
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
