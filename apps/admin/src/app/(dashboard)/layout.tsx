import { AdminSidebar } from "@/components/AdminSidebar";
import { serverApiFetch } from "@/lib/api-server";
import type { PostTypeDTO } from "@/types/api";

// サイドバーに登録済みのカスタム投稿タイプ一覧を出すため、レイアウトの時点で取得しておく。
// 未ログイン等でAPIが失敗した場合は空一覧として扱い、サイドバー自体は表示を続ける。
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const res = await serverApiFetch("/post-types");
  const postTypes: PostTypeDTO[] = res.ok ? (await res.json()).postTypes : [];

  return (
    <div className="admin-shell">
      <AdminSidebar postTypes={postTypes} />
      <main className="admin-content">{children}</main>
    </div>
  );
}
