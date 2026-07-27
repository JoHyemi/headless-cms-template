"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { uploadFile } from "@/lib/api-client";

export function MediaUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadFile("/media", formData);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました。");
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("ネットワークエラーによりアップロードに失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="actions-row" style={{ marginBottom: "1.5rem" }}>
      {error && <p className="error-text">{error}</p>}
      <input ref={inputRef} type="file" required style={{ flex: 1, minWidth: "200px" }} />
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? "アップロード中…" : "アップロード"}
      </button>
    </form>
  );
}
