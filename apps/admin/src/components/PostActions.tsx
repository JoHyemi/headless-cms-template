"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Props = {
  id: string;
  status: "DRAFT" | "PUBLISHED";
};

// 管理者記事一覧で使う「公開/下書き切り替え」及び「削除」ボタン。
export function PostActions({ id, status }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggleStatus() {
    setPending(true);
    try {
      const nextStatus = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
      const res = await apiFetch(`/posts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch {
      alert("ステータス変更に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!confirm("この記事を削除しますか？元に戻せません。")) return;
    setPending(true);
    try {
      const res = await apiFetch(`/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="actions-row">
      <button className="btn" onClick={toggleStatus} disabled={pending}>
        {status === "PUBLISHED" ? "下書きに戻す" : "公開する"}
      </button>
      <Link href={`/posts/${id}/edit`} className="btn">
        編集する
      </Link>
      <button className="btn btn-danger" onClick={remove} disabled={pending}>
        削除
      </button>
    </div>
  );
}
