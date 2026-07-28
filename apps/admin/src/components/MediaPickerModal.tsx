"use client";

import { useEffect, useState } from "react";
import { API_URL, apiFetch, uploadFile } from "@/lib/api-client";
import type { MediaDTO } from "@/types/api";

type Props = {
  onSelect: (item: MediaDTO) => void;
  onClose: () => void;
};

function toAbsoluteUrl(url: string) {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

// 画像フィールド用のメディア選択モーダル。既存のアップロード済み画像から選ぶか、
// その場で新しくアップロードしてすぐ選択できます。一覧・アップロードは/mediaを共有するため、
// ここで新しくアップロードしたファイルは「メディア」画面にもそのまま表示されます。
export function MediaPickerModal({ onSelect, onClose }: Props) {
  const [media, setMedia] = useState<MediaDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadCaption, setUploadCaption] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/media")
      .then((res) => res.json())
      .then((data: { media: MediaDTO[] }) => {
        if (!cancelled) setMedia(data.media);
      })
      .catch(() => {
        if (!cancelled) setError("メディア一覧の取得に失敗しました。");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (uploadAlt.trim()) formData.append("alt", uploadAlt.trim());
      if (uploadCaption.trim()) formData.append("caption", uploadCaption.trim());
      const res = await uploadFile("/media", formData);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました。");
        return;
      }
      setMedia((prev) => [data as MediaDTO, ...(prev ?? [])]);
      setUploadAlt("");
      setUploadCaption("");
    } catch {
      setError("ネットワークエラーによりアップロードに失敗しました。");
    } finally {
      setUploading(false);
    }
  }

  const images = (media ?? []).filter((item) => item.mimeType.startsWith("image/"));

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: "min(720px, 100%)", maxHeight: "80vh", overflowY: "auto", marginBottom: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="page-title-row">
          <h2 style={{ fontSize: "1.1rem" }}>画像を選択</h2>
          <button type="button" className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="actions-row" style={{ marginBottom: "1.25rem" }}>
          <label className="btn" style={{ cursor: "pointer", display: "inline-flex" }}>
            {uploading ? "アップロード中…" : "+ 新しい画像をアップロード"}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
          <input
            type="text"
            value={uploadAlt}
            onChange={(e) => setUploadAlt(e.target.value)}
            placeholder="代替テキスト（alt・任意）"
            style={{ flex: 1, minWidth: "160px" }}
          />
          <input
            type="text"
            value={uploadCaption}
            onChange={(e) => setUploadCaption(e.target.value)}
            placeholder="キャプション（任意）"
            style={{ flex: 1, minWidth: "160px" }}
          />
        </div>

        {media === null ? (
          <p className="muted">読み込み中…</p>
        ) : images.length === 0 ? (
          <p className="empty-state">画像がまだアップロードされていません。上からアップロードしてみてください。</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {images.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                title={item.filename}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  padding: 0,
                  cursor: "pointer",
                  background: "var(--surface)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toAbsoluteUrl(item.url)}
                  alt={item.alt ?? item.filename}
                  style={{ width: "100%", height: "100px", objectFit: "cover", display: "block" }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
