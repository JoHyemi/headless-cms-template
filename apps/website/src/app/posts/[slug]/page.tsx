import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { BlockRenderer, PRESET_CUSTOM_COMPONENTS } from "@cms/blocks";
import { apiFetch, API_URL } from "@/lib/api";
import type { PostDTO } from "@/types/api";

type Props = { params: Promise<{ slug: string }> };

export default async function PostPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  // 動的ルートセグメントはパーセントエンコードされたまま渡されるため
  // (日本語などの非ASCII slug対応)、API呼び出し前に直接デコードします。
  const slug = decodeURIComponent(rawSlug);

  const res = await apiFetch(`/posts/slug/${encodeURIComponent(slug)}`);
  // 下書きはAPI自体がPUBLISHEDのみ許可するため、404はそのまま「存在しない」として扱えます。
  if (res.status === 404) {
    notFound();
  }
  const post = (await res.json()) as PostDTO;

  return (
    <>
      <SiteHeader />
      <main className="container">
        <p>
          <Link href="/">← 一覧に戻る</Link>
        </p>
        <h1>{post.title}</h1>
        <p className="muted">
          {post.author} · {new Date(post.createdAt).toLocaleDateString("ja-JP")}
        </p>
        {post.categories.length > 0 && (
          <div className="actions-row" style={{ marginTop: "0.5rem" }}>
            {post.categories.map((category) => (
              <Link key={category.id} href={`/?category=${category.slug}`} className="badge badge-category">
                {category.name}
              </Link>
            ))}
          </div>
        )}
        <article style={{ marginTop: "1.5rem" }}>
          <BlockRenderer
            blocks={post.content}
            customComponents={PRESET_CUSTOM_COMPONENTS}
            mediaBaseUrl={API_URL}
          />
        </article>
      </main>
    </>
  );
}
