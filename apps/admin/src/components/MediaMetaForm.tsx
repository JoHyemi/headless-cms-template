"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Props = { id: string; initialAlt: string | null; initialCaption: string | null };

// 既存メディアの代替テキスト(alt)・キャプションを後から編集するフォーム。/media/[id](PATCH)を呼び出します。
export function MediaMetaForm({ id, initialAlt, initialCaption }: Props) {
  const router = useRouter();
  const [alt, setAlt] = useState(initialAlt ?? "");
  const [caption, setCaption] = useState(initialCaption ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch(`/media/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ alt, caption }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch {
      alert("保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "0.75rem" }}>
      <input
        type="text"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        placeholder="代替テキスト（alt）"
        style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}
      />
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="キャプション"
        style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}
      />
      <button type="submit" className="btn" disabled={submitting} style={{ fontSize: "0.85rem", width: "100%" }}>
        {submitting ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
