"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@cms/ui";
import { apiFetch } from "@/lib/api-client";
import type { PostTypeDTO } from "@/types/api";

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3000";

const menuItems = [
  { href: "/posts", label: "記事管理", icon: "📄" },
  { href: "/posts/new", label: "新規投稿", icon: "➕" },
  { href: "/pages", label: "固定ページ管理", icon: "📃" },
  { href: "/categories", label: "カテゴリー管理", icon: "🗂️" },
  { href: "/media", label: "メディア", icon: "🖼️" },
  { href: "/block-types", label: "カスタムブロック", icon: "🧩" },
  { href: "/post-types", label: "カスタム投稿タイプ", icon: "🗃️" },
  { href: "/import", label: "WordPressインポート", icon: "📥" },
];

type Props = { postTypes?: PostTypeDTO[] };

export function AdminSidebar({ postTypes = [] }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="admin-sidebar">
      <Link href="/posts" className="admin-sidebar-brand">
        <Logo size={20} />
        Headless CMS
      </Link>

      <nav className="admin-sidebar-nav">
        {menuItems.map((item) => {
          const isActive =
            item.href === "/posts"
              ? pathname === "/posts" || /^\/posts\/[^/]+\/edit/.test(pathname)
              : item.href === "/pages"
                ? pathname === "/pages" || pathname.startsWith("/pages/")
                : item.href === "/block-types"
                  ? pathname === "/block-types" || pathname.startsWith("/block-types/")
                  : item.href === "/post-types"
                    ? pathname === "/post-types" || pathname.startsWith("/post-types/")
                    : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-sidebar-link${isActive ? " admin-sidebar-link-active" : ""}`}
            >
              <span className="admin-sidebar-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {postTypes.length > 0 && (
          <>
            <div className="admin-sidebar-section-label">投稿タイプ別エントリー</div>
            {postTypes.map((postType) => {
              const href = `/entries/${encodeURIComponent(postType.slug)}`;
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={postType.id}
                  href={href}
                  className={`admin-sidebar-link${isActive ? " admin-sidebar-link-active" : ""}`}
                >
                  <span className="admin-sidebar-icon">📦</span>
                  {postType.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="admin-sidebar-footer">
        <a href={WEBSITE_URL} className="admin-sidebar-link" target="_blank" rel="noopener noreferrer">
          <span className="admin-sidebar-icon">↩️</span>
          サイトを見る
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="admin-sidebar-link"
          style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
        >
          <span className="admin-sidebar-icon">🚪</span>
          ログアウト
        </button>
      </div>
    </aside>
  );
}
