import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { PostTypeEntryActions } from "@/components/PostTypeEntryActions";
import type { PostTypeDTO, PostTypeEntryDTO } from "@/types/api";

type Props = { params: Promise<{ typeSlug: string }> };

// カスタム投稿タイプのエントリー一覧。WordPressの投稿タイプ別一覧画面に相当します。
export default async function EntriesPage({ params }: Props) {
  const { typeSlug } = await params;
  const res = await serverApiFetch(`/post-types/${encodeURIComponent(typeSlug)}/all`);
  if (res.status === 404) notFound();

  const { postType, entries } = (await res.json()) as {
    postType: PostTypeDTO;
    entries: PostTypeEntryDTO[];
  };

  return (
    <>
      <div className="page-title-row">
        <div>
          <h1>{postType.name}</h1>
          <p className="muted">/{postType.slug}</p>
        </div>
        <Link href={`/entries/${encodeURIComponent(typeSlug)}/new`} className="btn btn-primary">
          + 新規作成
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">
          まだエントリーがありません。「+ 新規作成」から追加してみてください。
        </p>
      ) : (
        entries.map((entry) => (
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
            <div style={{ marginTop: "0.75rem" }}>
              <PostTypeEntryActions id={entry.id} typeSlug={typeSlug} status={entry.status} />
            </div>
          </div>
        ))
      )}
    </>
  );
}
