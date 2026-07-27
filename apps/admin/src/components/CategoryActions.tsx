"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Props = { id: string; postCount: number };

// カテゴリー削除ボタン。/categories/[id](DELETE)を呼び出します。
export function CategoryActions({ id, postCount }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    const message =
      postCount > 0
        ? `このカテゴリーを削除しますか？${postCount}件の記事からこのカテゴリーの関連付けが解除されます。`
        : "このカテゴリーを削除しますか？元に戻せません。";
    if (!confirm(message)) return;

    setPending(true);
    try {
      const res = await apiFetch(`/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="btn btn-danger" onClick={remove} disabled={pending}>
      削除
    </button>
  );
}
