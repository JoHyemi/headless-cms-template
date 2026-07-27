"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

export function MediaActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (!confirm("このメディアを削除しますか？元に戻せません。")) return;
    setPending(true);
    try {
      const res = await apiFetch(`/media/${id}`, { method: "DELETE" });
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
