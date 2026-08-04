"use client";

import { useMemo, useState } from "react";

const PAGE_SIZE = 10;

/** 一覧画面共通の「タイトル検索 + ページネーション」ロジック。サーバーへの再フェッチや
 *  ページ遷移(URL変更)を行わず、既に取得済みの配列をクライアント側で絞り込む。 */
export function useSearchPagination<T>(items: T[], getSearchText: (item: T) => string) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }, [items, query, getSearchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page_ = Math.min(page, totalPages);
  const pageItems = filtered.slice((page_ - 1) * PAGE_SIZE, page_ * PAGE_SIZE);

  function setQueryAndResetPage(value: string) {
    setQuery(value);
    setPage(1);
  }

  return {
    query,
    setQuery: setQueryAndResetPage,
    page: page_,
    setPage,
    totalPages,
    pageItems,
    totalCount: filtered.length,
  };
}
