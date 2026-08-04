"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PostTypeEntryActions } from "@/components/PostTypeEntryActions";
import { Pagination } from "@/components/Pagination";
import { useSearchPagination } from "@/lib/useSearchPagination";
import type { PostTypeEntryDTO } from "@/types/api";

type Props = { typeSlug: string; entries: PostTypeEntryDTO[] };

// カスタム投稿タイプのエントリー一覧のタイトル検索 + ページネーション(ページ遷移なし)。
export function PostTypeEntryList({ typeSlug, entries }: Props) {
  const getSearchText = useCallback((entry: PostTypeEntryDTO) => entry.title, []);
  const { query, setQuery, page, setPage, totalPages, pageItems, totalCount } =
    useSearchPagination(entries, getSearchText);

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="タイトルで検索"
        style={{ marginBottom: "1.25rem", maxWidth: "360px" }}
      />

      {entries.length === 0 ? (
        <p className="empty-state">
          まだエントリーがありません。「+ 新規作成」から追加してみてください。
        </p>
      ) : totalCount === 0 ? (
        <p className="empty-state">「{query}」に一致するエントリーが見つかりません。</p>
      ) : (
        <>
          {pageItems.map((entry) => (
            <div key={entry.id} className="card">
              <div className="page-title-row" style={{ marginBottom: "0.5rem" }}>
                <h2 style={{ fontSize: "1.1rem" }}>
                  <Link href={`/entries/${encodeURIComponent(typeSlug)}/${entry.id}/edit`}>
                    {entry.title}
                  </Link>
                </h2>
                <span
                  className={
                    entry.status === "PUBLISHED"
                      ? "badge badge-published"
                      : entry.status === "SCHEDULED"
                        ? "badge badge-scheduled"
                        : "badge badge-draft"
                  }
                >
                  {entry.status === "PUBLISHED"
                    ? "公開済み"
                    : entry.status === "SCHEDULED"
                      ? "予約公開"
                      : "下書き"}
                </span>
              </div>
              <p className="muted">
                /{entry.slug} · {new Date(entry.updatedAt).toLocaleString("ja-JP")}
                {entry.status === "SCHEDULED" && entry.publishAt && (
                  <> · 公開予定: {new Date(entry.publishAt).toLocaleString("ja-JP")}</>
                )}
              </p>
              {entry.categories.length > 0 && (
                <div className="actions-row" style={{ marginTop: "0.5rem" }}>
                  {entry.categories.map((category) => (
                    <span key={category.id} className="badge badge-category">
                      {category.name}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: "0.75rem" }}>
                <PostTypeEntryActions id={entry.id} typeSlug={typeSlug} status={entry.status} />
              </div>
            </div>
          ))}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
