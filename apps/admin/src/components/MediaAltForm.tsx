"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Props = { id: string; initialAlt: string | null };

// 既存メディアの代替テキスト(alt)を後から編集するフォーム。/media/[id](PATCH)を呼び出します。
export function MediaAltForm({ id, initialAlt }: Props) {
  const router = useRouter();
  const [alt, setAlt] = useState(initialAlt ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch(`/media/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ alt }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch {
      alert("altの保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="actions-row" style={{ marginBottom: "0.75rem" }}>
      <input
        type="text"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        placeholder="代替テキスト（alt）"
        style={{ flex: 1, minWidth: 0, fontSize: "0.85rem" }}
      />
      <button type="submit" className="btn" disabled={submitting} style={{ fontSize: "0.85rem" }}>
        {submitting ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
