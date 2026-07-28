"use client";

import { useRouter } from "next/navigation";
import { FormEvent, SyntheticEvent, useState } from "react";
import {
  BlockRenderer,
  defaultBlocks,
  hasContent,
  normalizeBlocks,
  PRESET_CUSTOM_COMPONENTS,
  type Block,
} from "@cms/blocks";
import { BlockEditor } from "@/components/BlockEditor";
import { API_URL, apiFetch } from "@/lib/api-client";
import type { BlockTypeDTO, CategoryDTO, PostDTO } from "@/types/api";

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3000";

// カスタムブロックの必須フィールドが空のまま保存されると、hasContent()が「内容なし」と
// 判断してブロックごと黙って削除してしまう(他のブロックと同じ扱い)。それ自体は既存の
// 仕様通りだが、カスタムブロックの場合は警告なしに消えるとユーザーが気づけないため、
// 保存前にここで検出してはっきりしたエラーメッセージを出す。
function findMissingRequiredField(blocks: Block[], blockTypes: BlockTypeDTO[]): string | null {
  for (const block of blocks) {
    if (block.type !== "custom") continue;
    const def = blockTypes.find((bt) => bt.slug === block.blockType);
    if (!def) continue;

    for (const field of def.fields) {
      if (!field.required) continue;
      if (field.type === "boolean" || field.type === "number") continue;

      const value = block.fields[field.key];
      const isEmpty = typeof value !== "string" || value.trim().length === 0;
      if (isEmpty) {
        return `「${def.name}」ブロックの「${field.label}」は必須です。入力するか、不要であればブロックを削除してください。`;
      }
    }
  }
  return null;
}

type Props = {
  mode: "create" | "edit";
  post?: PostDTO;
  allCategories: CategoryDTO[];
  blockTypes?: BlockTypeDTO[];
};

// 記事作成/修正共用フォーム。API(/posts)を呼び出して保存します。
export function PostForm({ mode, post, allCategories, blockTypes = [] }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [blocks, setBlocks] = useState<Block[]>(post ? post.content : defaultBlocks());
  const [author, setAuthor] = useState(post?.author ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(post?.status ?? "DRAFT");
  const [categoryIds, setCategoryIds] = useState<string[]>(
    post?.categories.map((c) => c.id) ?? []
  );
  const [categories, setCategories] = useState<CategoryDTO[]>(allCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const previewCategories = categories.filter((c) => categoryIds.includes(c.id));
  const previewDate = post?.createdAt ? new Date(post.createdAt) : new Date();

  function toggleCategory(id: string) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
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

    const missingFieldError = findMissingRequiredField(blocks, blockTypes);
    if (missingFieldError) {
      setError(missingFieldError);
      return;
    }

    const cleanedBlocks = normalizeBlocks(blocks);
    if (cleanedBlocks.length === 0) {
      setError("本文の内容を入力してください。");
      return;
    }

    setSubmitting(true);

    const finalStatus = publish === undefined ? status : publish ? "PUBLISHED" : "DRAFT";

    try {
      const res = await apiFetch(mode === "create" ? "/posts" : `/posts/${post!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify({
          title,
          content: cleanedBlocks,
          author: author || undefined,
          status: finalStatus,
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

      router.push("/posts");
      router.refresh();
    } catch {
      setError("ネットワークエラーにより保存に失敗しました。");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="actions-row" style={{ justifyContent: "flex-end", marginBottom: "1rem" }}>
        {mode === "edit" && post?.status === "PUBLISHED" ? (
          <a
            href={`${WEBSITE_URL}/posts/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            記事を見る ↗
          </a>
        ) : (
          mode === "edit" && (
            <span className="hint">公開後に記事ページを確認できます。</span>
          )
        )}
        <button type="button" className="btn" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "編集に戻る" : "プレビュー"}
        </button>
      </div>

      {showPreview ? (
        <article className="card">
          <h1>{title || "(タイトルなし)"}</h1>
          <p className="muted">
            {author || "Admin"} · {previewDate.toLocaleDateString("ja-JP")}
          </p>
          {previewCategories.length > 0 && (
            <div className="actions-row" style={{ marginTop: "0.5rem" }}>
              {previewCategories.map((category) => (
                <span key={category.id} className="badge badge-category">
                  {category.name}
                </span>
              ))}
            </div>
          )}
          <div style={{ marginTop: "1.5rem" }}>
            {blocks.some(hasContent) ? (
              <BlockRenderer
                blocks={blocks}
                customComponents={PRESET_CUSTOM_COMPONENTS}
                mediaBaseUrl={API_URL}
              />
            ) : (
              <p className="muted">(本文なし)</p>
            )}
          </div>
        </article>
      ) : (
        <form onSubmit={(e) => handleSubmit(e)}>
          {error && <p className="error-text">{error}</p>}

          <div className="field">
            <label htmlFor="title">タイトル</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="記事のタイトルを入力してください"
              required
            />
          </div>

          <div className="field">
            <label>本文</label>
            <BlockEditor blocks={blocks} onChange={setBlocks} blockTypes={blockTypes} />
          </div>

          <div className="field">
            <label htmlFor="author">投稿者</label>
            <input
              id="author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Admin"
            />
          </div>

          <div className="field">
            <label>カテゴリー</label>
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
                style={{ flex: 1, minWidth: "160px" }}
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

          <div className="field">
            <label htmlFor="status">ステータス</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED")}
            >
              <option value="DRAFT">下書き (DRAFT)</option>
              <option value="PUBLISHED">公開 (PUBLISHED)</option>
            </select>
          </div>

          {mode === "edit" ? (
            <div className="field">
              <label htmlFor="slug">slug</label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="post-slug"
                required
              />
              <span className="hint">
                空白・特殊文字は保存時に自動でハイフンに整理されます。他の記事と重複すると保存に失敗します。
              </span>
            </div>
          ) : (
            <span className="hint">slugはタイトルをもとに自動生成されます。</span>
          )}

          <div className="actions-row">
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
        </form>
      )}
    </>
  );
}
