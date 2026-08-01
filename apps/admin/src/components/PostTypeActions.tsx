"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Props = { id: string; slug: string };

// カスタム投稿タイプの「エントリー管理へ」「編集」「削除」ボタン。
// /post-types/[id](DELETE)を呼び出す — PostTypeEntryはonDelete: Cascadeなので、
// 削除するとこの投稿タイプに属するエントリーもすべて削除される。
export function PostTypeActions({ id, slug }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (
      !confirm(
        "この投稿タイプを削除しますか？この投稿タイプに属するエントリーもすべて削除され、元に戻せません。"
      )
    )
      return;

    setPending(true);
    try {
      const res = await apiFetch(`/post-types/${id}`, { method: "DELETE" });
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
      <Link href={`/entries/${encodeURIComponent(slug)}`} className="btn">
        エントリー管理
      </Link>
      <Link href={`/post-types/${id}/edit`} className="btn">
        編集する
      </Link>
      <button className="btn btn-danger" onClick={remove} disabled={pending}>
        削除
      </button>
    </div>
  );
}
