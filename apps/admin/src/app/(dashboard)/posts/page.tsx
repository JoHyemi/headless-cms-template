import Link from "next/link";
import { serverApiFetch } from "@/lib/api-server";
import { PostList } from "@/components/PostList";
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

      <PostList posts={posts} />
    </>
  );
}
