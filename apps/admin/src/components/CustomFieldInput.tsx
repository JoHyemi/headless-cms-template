"use client";

import type { FieldDef, FieldValue } from "@cms/blocks";
import { ImageUrlField } from "@/components/ImageUrlField";

// FieldDefの型(text/textarea/number/boolean/url/image)ごとに適切な入力UIを出す共通コンポーネント。
// カスタムブロック(BlockEditor)とカスタム投稿タイプ(PostTypeEntryForm)の両方から使われる —
// どちらも「FieldDef[]で定義したフィールドの値をkey:valueで編集する」という同じ形をしているため。
export function CustomFieldInput({
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
