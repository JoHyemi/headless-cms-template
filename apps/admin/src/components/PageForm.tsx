"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
import type { BlockTypeDTO, PageDTO } from "@/types/api";

// カスタムブロックの必須フィールドが空のまま保存されると、hasContent()が「内容なし」と
// 判断してブロックごと黙って削除してしまう(PostFormと同じ理由の事前チェック)。
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
  page?: PageDTO;
  blockTypes?: BlockTypeDTO[];
};

// 固定ページ作成/修正共用フォーム。API(/pages)を呼び出して保存します。
// Postと違いカテゴリー・作成者・要約の概念がないため、その分シンプルな構成です。
export function PageForm({ mode, page, blockTypes = [] }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(page?.title ?? "");
  const [blocks, setBlocks] = useState<Block[]>(page ? page.content : defaultBlocks());
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED" | "PUBLISHED">(page?.status ?? "DRAFT");
  const [publishAt, setPublishAt] = useState(toDatetimeLocalValue(page?.publishAt));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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
      const res = await apiFetch(mode === "create" ? "/pages" : `/pages/${page!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify({
          title,
          content: cleanedBlocks,
          status: finalStatus,
          ...(finalStatus === "SCHEDULED"
            ? { publishAt: new Date(publishAt).toISOString() }
            : {}),
          ...(mode === "edit" ? { slug } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました。");
        setSubmitting(false);
        return;
      }

      router.push("/pages");
      router.refresh();
    } catch {
      setError("ネットワークエラーにより保存に失敗しました。");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="actions-row" style={{ justifyContent: "flex-end", marginBottom: "1rem" }}>
        <button type="button" className="btn" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "編集に戻る" : "プレビュー"}
        </button>
      </div>

      {showPreview ? (
        <article className="card">
          <h1>{title || "(タイトルなし)"}</h1>
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

          <div className="post-editor-grid">
            <div className="post-editor-main">
              <div className="field">
                <label htmlFor="title">タイトル</label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="固定ページのタイトルを入力してください"
                  required
                />
              </div>

              <div className="field">
                <label>本文</label>
                <BlockEditor blocks={blocks} onChange={setBlocks} blockTypes={blockTypes} />
              </div>
            </div>

            <aside className="post-editor-sidebar">
              <div className="card">
                <h2 className="sidebar-card-title">公開設定</h2>

                <div className="field">
                  <label htmlFor="status">ステータス</label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "DRAFT" | "SCHEDULED" | "PUBLISHED")
                    }
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
                      placeholder="page-slug"
                      required
                    />
                    <span className="hint">
                      空白・特殊文字は保存時に自動でハイフンに整理されます。他の固定ページと重複すると保存に失敗します。
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
            </aside>
          </div>
        </form>
      )}
    </>
  );
}
