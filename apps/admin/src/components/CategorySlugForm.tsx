"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type Props = { id: string; initialSlug: string };

// 既存カテゴリーのslugを後から編集するフォーム。/categories/[id](PATCH)を呼び出します
// (MediaMetaFormと同じ、常時表示のインライン編集パターン)。
export function CategorySlugForm({ id, initialSlug }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました。");
        setSubmitting(false);
        return;
      }
      setSlug(data.slug);
      router.refresh();
    } catch {
      setError("ネットワークエラーにより保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="actions-row" style={{ marginBottom: "0.5rem", alignItems: "center" }}>
      {error && (
        <p className="error-text" style={{ width: "100%", margin: 0 }}>
          {error}
        </p>
      )}
      <span className="muted">/</span>
      <input
        type="text"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="slug"
        style={{ flex: 1, minWidth: "120px", fontSize: "0.85rem" }}
        required
      />
      <button type="submit" className="btn" disabled={submitting} style={{ fontSize: "0.85rem" }}>
        {submitting ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
