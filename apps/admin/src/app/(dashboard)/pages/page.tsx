import Link from "next/link";
import { serverApiFetch } from "@/lib/api-server";
import { PageList } from "@/components/PageList";
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

      <PageList pages={pages} />
    </>
  );
}
