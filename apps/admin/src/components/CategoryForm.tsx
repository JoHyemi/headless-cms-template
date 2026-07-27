"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api-client";

// 新しいカテゴリー作成フォーム。/categories(POST)を呼び出します。
export function CategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "作成に失敗しました。");
        setSubmitting(false);
        return;
      }
      setName("");
      router.refresh();
    } catch {
      setError("ネットワークエラーにより作成に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="actions-row" style={{ marginBottom: "1.5rem" }}>
      {error && <p className="error-text">{error}</p>}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="新しいカテゴリー名（例：お知らせ）"
        required
        style={{ flex: 1, minWidth: "200px" }}
      />
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "追加中…" : "カテゴリー追加"}
      </button>
    </form>
  );
}
