import Link from "next/link";
import { serverApiFetch } from "@/lib/api-server";
import { PageActions } from "@/components/PageActions";
import type { PageDTO } from "@/types/api";

// 管理者固定ページ一覧: 下書き/公開状態と関係なく全ページを最新順で表示します(PostsPageと同じ形)。
export default async function AdminPagesPage() {
  const res = await serverApiFetch("/pages/all");
  const { pages } = (await res.json()) as { pages: PageDTO[] };

  return (
    <>
      <div className="page-title-row">
        <h1>固定ページ管理</h1>
        <Link href="/pages/new" className="btn btn-primary">
          + 新規作成
        </Link>
      </div>

      {pages.length === 0 ? (
        <p className="empty-state">
          作成された固定ページがありません。<Link href="/pages/new">新規作成</Link>してみてください。
        </p>
      ) : (
        pages.map((page) => (
          <div key={page.id} className="card">
            <div className="page-title-row" style={{ marginBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1.1rem" }}>
                <Link href={`/pages/${page.id}/edit`}>{page.title}</Link>
              </h2>
              <span
                className={
                  page.status === "PUBLISHED"
                    ? "badge badge-published"
                    : page.status === "SCHEDULED"
                      ? "badge badge-scheduled"
                      : "badge badge-draft"
                }
              >
                {page.status === "PUBLISHED"
                  ? "公開済み"
                  : page.status === "SCHEDULED"
                    ? "予約公開"
                    : "下書き"}
              </span>
            </div>
            <p className="muted">
              /{page.slug} · {new Date(page.updatedAt).toLocaleString("ja-JP")}
              {page.status === "SCHEDULED" && page.publishAt && (
                <> · 公開予定: {new Date(page.publishAt).toLocaleString("ja-JP")}</>
              )}
            </p>
            <div style={{ marginTop: "0.75rem" }}>
              <PageActions id={page.id} status={page.status} />
            </div>
          </div>
        ))
      )}
    </>
  );
}
