import Link from "next/link";
import { Logo } from "@cms/ui";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav>
        <Link href="/" className="brand">
          <Logo size={20} />
          Headless CMS
        </Link>
        <Link href="/">ホーム</Link>
        <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer">
          管理者
        </a>
      </nav>
    </header>
  );
}
