"use client";

import { useState } from "react";

// アップロードされたファイルの実際のURLをすぐコピーできるようにする表示欄。
export function MediaUrlField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // クリップボードAPIが使えない環境向けのフォールバック: 手動で選択してもらう。
    }
  }

  return (
    <div className="actions-row" style={{ marginBottom: "0.75rem" }}>
      <input
        type="text"
        value={url}
        readOnly
        onFocus={(e) => e.target.select()}
        style={{ flex: 1, minWidth: 0, fontSize: "0.78rem" }}
      />
      <button type="button" className="btn" onClick={handleCopy} style={{ fontSize: "0.85rem", flexShrink: 0 }}>
        {copied ? "コピーしました" : "コピー"}
      </button>
    </div>
  );
}
