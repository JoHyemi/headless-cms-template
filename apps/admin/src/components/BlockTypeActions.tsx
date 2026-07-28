"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Props = { id: string };

// カスタムブロック削除ボタン。/block-types/[id](DELETE)を呼び出します。
export function BlockTypeActions({ id }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (
      !confirm(
        "このカスタムブロックを削除しますか？既にこのブロックタイプで作成済みの記事は影響を受けませんが、新規追加はできなくなります。"
      )
    )
      return;

    setPending(true);
    try {
      const res = await apiFetch(`/block-types/${id}`, { method: "DELETE" });
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
      <Link href={`/block-types/${id}/edit`} className="btn">
        編集する
      </Link>
      <button className="btn btn-danger" onClick={remove} disabled={pending}>
        削除
      </button>
    </div>
  );
}
