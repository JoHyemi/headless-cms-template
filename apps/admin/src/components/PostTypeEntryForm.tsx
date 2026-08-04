"use client";

import { useRouter } from "next/navigation";
import { FormEvent, SyntheticEvent, useState } from "react";
import { defaultFieldValue, type FieldValue } from "@cms/blocks";
import { CustomFieldInput } from "@/components/CustomFieldInput";
import { apiFetch } from "@/lib/api-client";
import type { CategoryDTO, PostTypeDTO, PostTypeEntryDTO } from "@/types/api";

// <input type="datetime-local">は"YYYY-MM-DDTHH:mm"をローカル時刻として扱うため、
// DBのISO文字列(UTC)をローカルのgetter(getHours等)で変換する(PostFormと同じ実装)。
function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Props = {
  mode: "create" | "edit";
  postType: PostTypeDTO;
  entry?: PostTypeEntryDTO;
  allCategories: CategoryDTO[];
};

// カスタム投稿タイプのエントリー作成/修正共用フォーム。本文はBlockEditorではなく、
// postType.fields(FieldDef[])で定義されたフィールドをCustomFieldInputで1つずつ編集する
// (カスタムブロックのフィールド編集UIと同じ部品を再利用している)。カテゴリー選択は
// PostFormと同じ部品(その場での新規作成含む)。
export function PostTypeEntryForm({ mode, postType, entry, allCategories }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [slug, setSlug] = useState(entry?.slug ?? "");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED" | "PUBLISHED">(
    entry?.status ?? "DRAFT"
  );
  const [publishAt, setPublishAt] = useState(toDatetimeLocalValue(entry?.publishAt));
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>(() => {
    const initial: Record<string, FieldValue> = {};
    for (const field of postType.fields) {
      initial[field.key] = entry?.fieldValues[field.key] ?? defaultFieldValue(field.type);
    }
    return initial;
  });
  const [categoryIds, setCategoryIds] = useState<string[]>(
    entry?.categories.map((c) => c.id) ?? []
  );
  const [categories, setCategories] = useState<CategoryDTO[]>(allCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateFieldValue(key: string, value: FieldValue) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleCreateCategory(e: SyntheticEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCategoryError(null);
    setCreatingCategory(true);

    try {
      const res = await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCategoryError(data.error ?? "カテゴリーの作成に失敗しました。");
        return;
      }

      const created: CategoryDTO = data;
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryIds((prev) => [...prev, created.id]);
      setNewCategoryName("");
    } catch {
      setCategoryError("ネットワークエラーによりカテゴリーの作成に失敗しました。");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleSubmit(e: FormEvent, publish?: boolean) {
    e.preventDefault();
    setError(null);

    for (const field of postType.fields) {
      if (!field.required) continue;
      if (field.type === "boolean" || field.type === "number") continue;
      const value = fieldValues[field.key];
      const isEmpty = typeof value !== "string" || value.trim().length === 0;
      if (isEmpty) {
        setError(`「${field.label}」は必須です。`);
        return;
      }
    }

    const finalStatus = publish === undefined ? status : publish ? "PUBLISHED" : "DRAFT";

    if (finalStatus === "SCHEDULED") {
      if (!publishAt) {
        setError("予約公開には公開予定日時を指定してください。");
        return;
      }
      if (new Date(publishAt).getTime() <= Date.now()) {
        setError("公開予定日時は未来の日時を指定してください。");
        return;
      }
    }

    setSubmitting(true);

    try {
      const path =
        mode === "create"
          ? `/post-types/${encodeURIComponent(postType.slug)}`
          : `/post-types/${encodeURIComponent(postType.slug)}/${entry!.id}`;

      const res = await apiFetch(path, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify({
          title,
          fieldValues,
          status: finalStatus,
          ...(finalStatus === "SCHEDULED"
            ? { publishAt: new Date(publishAt).toISOString() }
            : {}),
          categoryIds,
          ...(mode === "edit" ? { slug } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました。");
        setSubmitting(false);
        return;
      }

      router.push(`/entries/${encodeURIComponent(postType.slug)}`);
      router.refresh();
    } catch {
      setError("ネットワークエラーにより保存に失敗しました。");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e)}>
      {error && <p className="error-text">{error}</p>}

      <div className="post-editor-grid">
        <div className="post-editor-main">
          <div className="field">
            <label htmlFor="title">タイトル</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="エントリーのタイトルを入力してください"
              required
            />
          </div>

          {postType.fields.map((field) => (
            <CustomFieldInput
              key={field.key}
              field={field}
              value={fieldValues[field.key]}
              onChange={(value) => updateFieldValue(field.key, value)}
            />
          ))}
        </div>

        <aside className="post-editor-sidebar">
          <div className="card">
            <h2 className="sidebar-card-title">公開設定</h2>

            <div className="field">
              <label htmlFor="status">ステータス</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "DRAFT" | "SCHEDULED" | "PUBLISHED")}
              >
                <option value="DRAFT">下書き (DRAFT)</option>
                <option value="SCHEDULED">予約公開 (SCHEDULED)</option>
                <option value="PUBLISHED">公開 (PUBLISHED)</option>
              </select>
            </div>

            {status === "SCHEDULED" && (
              <div className="field">
                <label htmlFor="publishAt">公開予定日時</label>
                <input
                  id="publishAt"
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  required
                />
                <span className="hint">
                  この日時になると自動的に公開(PUBLISHED)に切り替わります。
                </span>
              </div>
            )}

            {mode === "edit" ? (
              <div className="field">
                <label htmlFor="slug">slug</label>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="entry-slug"
                  required
                />
                <span className="hint">
                  空白・特殊文字は保存時に自動でハイフンに整理されます。同じ投稿タイプ内の
                  他のエントリーと重複すると保存に失敗します。
                </span>
              </div>
            ) : (
              <span className="hint">slugはタイトルをもとに自動生成されます。</span>
            )}

            <div className="actions-row" style={{ marginTop: "0.9rem" }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "保存中…" : mode === "create" ? "保存" : "更新を保存"}
              </button>
              {status !== "PUBLISHED" && (
                <button
                  type="button"
                  className="btn"
                  disabled={submitting}
                  onClick={(e) => handleSubmit(e, true)}
                >
                  保存してすぐ公開
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="sidebar-card-title">カテゴリー</h2>
            {categories.length === 0 ? (
              <span className="hint">まだカテゴリーがありません。下から新しく追加してみてください。</span>
            ) : (
              <div className="actions-row">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="btn"
                    style={{
                      cursor: "pointer",
                      background: categoryIds.includes(category.id) ? "var(--accent)" : undefined,
                      borderColor: categoryIds.includes(category.id) ? "var(--accent)" : undefined,
                      color: categoryIds.includes(category.id) ? "var(--accent-foreground)" : undefined,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      style={{ display: "none" }}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            )}

            {categoryError && <p className="error-text">{categoryError}</p>}
            <div className="actions-row" style={{ marginTop: "0.5rem" }}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="新しいカテゴリー名"
                style={{ flex: 1, minWidth: "120px" }}
              />
              <button
                type="button"
                className="btn"
                disabled={creatingCategory || !newCategoryName.trim()}
                onClick={handleCreateCategory}
              >
                {creatingCategory ? "追加中…" : "カテゴリー追加"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
