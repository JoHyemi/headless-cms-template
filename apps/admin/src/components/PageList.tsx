"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PageActions } from "@/components/PageActions";
import { Pagination } from "@/components/Pagination";
import { useSearchPagination } from "@/lib/useSearchPagination";
import type { PageDTO } from "@/types/api";

type Props = { pages: PageDTO[] };

// 固定ページ一覧のタイトル検索 + ページネーション(ページ遷移なし)。
export function PageList({ pages }: Props) {
  const getSearchText = useCallback((page: PageDTO) => page.title, []);
  const { query, setQuery, page, setPage, totalPages, pageItems, totalCount } =
    useSearchPagination(pages, getSearchText);

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="タイトルで検索"
        style={{ marginBottom: "1.25rem", maxWidth: "360px" }}
      />

      {pages.length === 0 ? (
        <p className="empty-state">
          作成された固定ページがありません。<Link href="/pages/new">新規作成</Link>してみてください。
        </p>
      ) : totalCount === 0 ? (
        <p className="empty-state">「{query}」に一致する固定ページが見つかりません。</p>
      ) : (
        <>
          {pageItems.map((item) => (
            <div key={item.id} className="card">
              <div className="page-title-row" style={{ marginBottom: "0.5rem" }}>
                <h2 style={{ fontSize: "1.1rem" }}>
                  <Link href={`/pages/${item.id}/edit`}>{item.title}</Link>
                </h2>
                <span
                  className={
                    item.status === "PUBLISHED"
                      ? "badge badge-published"
                      : item.status === "SCHEDULED"
                        ? "badge badge-scheduled"
                        : "badge badge-draft"
                  }
                >
                  {item.status === "PUBLISHED"
                    ? "公開済み"
                    : item.status === "SCHEDULED"
                      ? "予約公開"
                      : "下書き"}
                </span>
              </div>
              <p className="muted">
                /{item.slug} · {new Date(item.updatedAt).toLocaleString("ja-JP")}
                {item.status === "SCHEDULED" && item.publishAt && (
                  <> · 公開予定: {new Date(item.publishAt).toLocaleString("ja-JP")}</>
                )}
              </p>
              <div style={{ marginTop: "0.75rem" }}>
                <PageActions id={item.id} status={item.status} />
              </div>
            </div>
          ))}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
