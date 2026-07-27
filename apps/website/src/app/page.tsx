import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { apiFetch } from "@/lib/api";
import type { CategoryDTO, PostDTO } from "@/types/api";

type Props = { searchParams: Promise<{ category?: string }> };

// 公開ホームページ: 公開(PUBLISHED)された記事のみ最新順で表示します。
// ヘッドレスCMSの「コンテンツ消費側(フロントエンド)」の例です。API(/posts, /categories)
// だけを呼び出し、データベースには一切アクセスしません。
export default async function Home({ searchParams }: Props) {
  const { category: categorySlug } = await searchParams;

  const [postsRes, categoriesRes] = await Promise.all([
    apiFetch(`/posts${categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : ""}`),
    apiFetch("/categories"),
  ]);

  const { posts } = (await postsRes.json()) as { posts: PostDTO[] };
  const { categories } = (await categoriesRes.json()) as { categories: CategoryDTO[] };

  return (
    <>
      <SiteHeader />
      <main className="container">
        <div className="page-title-row">
          <h1>公開された記事</h1>
        </div>

        {categories.length > 0 && (
          <div className="actions-row" style={{ marginBottom: "1.5rem" }}>
            <Link href="/" className={`badge badge-category${!categorySlug ? " badge-category-active" : ""}`}>
              すべて
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/?category=${category.slug}`}
                className={`badge badge-category${categorySlug === category.slug ? " badge-category-active" : ""}`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <p className="empty-state">
            {categorySlug
              ? "このカテゴリーにはまだ公開された記事がありません。"
              : "まだ公開された記事がありません。"}
          </p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="card">
              <h2>
                <Link href={`/posts/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="muted">
                {post.author} · {new Date(post.createdAt).toLocaleDateString("ja-JP")}
              </p>
              {post.categories.length > 0 && (
                <div className="actions-row" style={{ marginTop: "0.5rem" }}>
                  {post.categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/?category=${category.slug}`}
                      className="badge badge-category"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}
              {post.excerpt && <p style={{ marginTop: "0.5rem" }}>{post.excerpt}</p>}
            </article>
          ))
        )}
      </main>
    </>
  );
}
