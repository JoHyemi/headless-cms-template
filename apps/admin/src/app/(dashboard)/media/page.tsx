import { serverApiFetch } from "@/lib/api-server";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { MediaActions } from "@/components/MediaActions";
import { MediaMetaForm } from "@/components/MediaMetaForm";
import type { MediaDTO } from "@/types/api";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function MediaPage() {
  const res = await serverApiFetch("/media");
  const { media } = (await res.json()) as { media: MediaDTO[] };

  return (
    <>
      <div className="page-title-row">
        <h1>メディア</h1>
      </div>

      <MediaUploadForm />

      {media.length === 0 ? (
        <p className="empty-state">まだアップロードされたファイルがありません。</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
          {media.map((item) => (
            <div key={item.id} className="card" style={{ marginBottom: 0 }}>
              {item.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${API_URL}${item.url}`}
                  alt={item.alt ?? item.filename}
                  style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "8px", marginBottom: "0.75rem" }}
                />
              ) : (
                <div className="muted" style={{ marginBottom: "0.75rem" }}>
                  📄 {item.mimeType}
                </div>
              )}
              <p style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{item.filename}</p>
              <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                {formatSize(item.size)}
              </p>
              {item.mimeType.startsWith("image/") && (
                <MediaMetaForm id={item.id} initialAlt={item.alt} initialCaption={item.caption} />
              )}
              <MediaActions id={item.id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
