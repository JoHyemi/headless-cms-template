"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@cms/ui";
import { apiFetch } from "@/lib/api-client";

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3000";

const menuItems = [
  { href: "/posts", label: "記事管理", icon: "📄" },
  { href: "/posts/new", label: "新規投稿", icon: "➕" },
  { href: "/categories", label: "カテゴリー管理", icon: "🗂️" },
  { href: "/media", label: "メディア", icon: "🖼️" },
];

export function AdminSidebar() {
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
