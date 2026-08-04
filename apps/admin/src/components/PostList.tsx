"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PostActions } from "@/components/PostActions";
import { Pagination } from "@/components/Pagination";
import { useSearchPagination } from "@/lib/useSearchPagination";
import type { PostDTO } from "@/types/api";

type Props = { posts: PostDTO[] };

// 記事一覧のタイトル検索 + ページネーション(ページ遷移なし)。
export function PostList({ posts }: Props) {
  const getSearchText = useCallback((post: PostDTO) => post.title, []);
  const { query, setQuery, page, setPage, totalPages, pageItems, totalCount } =
    useSearchPagination(posts, getSearchText);

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="タイトルで検索"
        style={{ marginBottom: "1.25rem", maxWidth: "360px" }}
      />

      {posts.length === 0 ? (
        <p className="empty-state">
          作成された記事がありません。<Link href="/posts/new">新規投稿</Link>してみてください。
        </p>
      ) : totalCount === 0 ? (
        <p className="empty-state">「{query}」に一致する記事が見つかりません。</p>
      ) : (
        <>
          {pageItems.map((post) => (
            <div key={post.id} className="card">
              <div className="page-title-row" style={{ marginBottom: "0.5rem" }}>
                <h2 style={{ fontSize: "1.1rem" }}>
                  <Link href={`/posts/${post.id}/edit`}>{post.title}</Link>
                </h2>
                <span
                  className={
                    post.status === "PUBLISHED"
                      ? "badge badge-published"
                      : post.status === "SCHEDULED"
                        ? "badge badge-scheduled"
                        : "badge badge-draft"
                  }
                >
                  {post.status === "PUBLISHED"
                    ? "公開済み"
                    : post.status === "SCHEDULED"
                      ? "予約公開"
                      : "下書き"}
                </span>
              </div>
              <p className="muted">
                /{post.slug} · {post.author} · {new Date(post.updatedAt).toLocaleString("ja-JP")}
                {post.status === "SCHEDULED" && post.publishAt && (
                  <> · 公開予定: {new Date(post.publishAt).toLocaleString("ja-JP")}</>
                )}
              </p>
              {post.categories.length > 0 && (
                <div className="actions-row" style={{ marginTop: "0.5rem" }}>
                  {post.categories.map((category) => (
                    <span key={category.id} className="badge badge-category">
                      {category.name}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: "0.75rem" }}>
                <PostActions id={post.id} status={post.status} />
              </div>
            </div>
          ))}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
}
