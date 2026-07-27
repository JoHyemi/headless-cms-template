import Link from "next/link";
import { serverApiFetch } from "@/lib/api-server";
import { PostActions } from "@/components/PostActions";
import type { PostDTO } from "@/types/api";

// 管理者記事一覧: 下書き/公開状態と関係なく全記事を最新順で表示します。
export default async function AdminPostsPage() {
  const res = await serverApiFetch("/posts/all");
  const { posts } = (await res.json()) as { posts: PostDTO[] };

  return (
    <>
      <div className="page-title-row">
        <h1>記事管理</h1>
        <Link href="/posts/new" className="btn btn-primary">
          + 新規投稿
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="empty-state">
          作成された記事がありません。<Link href="/posts/new">新規投稿</Link>してみてください。
        </p>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="card">
            <div className="page-title-row" style={{ marginBottom: "0.5rem" }}>
              <h2 style={{ fontSize: "1.1rem" }}>
                <Link href={`/posts/${post.id}/edit`}>{post.title}</Link>
              </h2>
              <span className={post.status === "PUBLISHED" ? "badge badge-published" : "badge badge-draft"}>
                {post.status === "PUBLISHED" ? "公開済み" : "下書き"}
              </span>
            </div>
            <p className="muted">
              /{post.slug} · {post.author} ·{" "}
              {new Date(post.updatedAt).toLocaleString("ja-JP")}
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
        ))
      )}
    </>
  );
}
