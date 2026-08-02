"use client";

import { useState } from "react";
import { uploadFile } from "@/lib/api-client";

type ImportResult = {
  postsCreated: number;
  pagesCreated: number;
  categoriesCreated: number;
  postTypesCreated: number;
  postTypeEntriesCreated: number;
  blockTypesCreated: number;
  skipped: { title: string; reason: string }[];
  failed: { title: string; reason: string }[];
};

// WordPressの標準エクスポート(Tools > Export で書き出すWXR/.xmlファイル)を
// まるごと取り込む「オールインワン」インポート画面。記事・固定ページ・カテゴリー・タグを
// 一度に取り込み、本文はこのCMSのブロック形式に変換される(装飾HTMLはプレーンテキスト化)。
export function WordPressImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    if (
      !confirm(
        "WordPressのエクスポートファイルをインポートします。記事・固定ページ・カテゴリー・" +
          "カスタム投稿タイプが実際に作成されます(重複してもスキップされず追加されます)。続けますか?"
      )
    ) {
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadFile("/import/wordpress", formData);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? data.message ?? "インポートに失敗しました。");
        return;
      }
      setResult(data as ImportResult);
    } catch {
      setError("ネットワークエラーによりインポートに失敗しました。");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="card">
        <p style={{ marginBottom: "1rem" }}>
          WordPressの管理画面で「ツール」→「エクスポート」からダウンロードしたXMLファイル(WXR形式)を
          選択してください。記事・固定ページ・カテゴリー・タグ(タグはカテゴリーとして取り込まれます)・
          カスタム投稿タイプがこのCMSに作成されます。
        </p>
        <p className="hint" style={{ marginBottom: "1rem" }}>
          注意: 本文中の太字・リンクなどの装飾はプレーンテキストに変換されます(このCMSは安全のため
          自由なHTMLを保存しない設計のためです)。画像は元のURLのまま参照され、このCMSへは
          再アップロードされません。記事・固定ページに付いているカスタムフィールド(ACF等)は
          「カスタムブロック」として本文の末尾に自動的に追加されます。post/page以外の投稿タイプは、
          投稿タイプごとに「カスタム投稿タイプ」として自動的に定義され(本文・抜粋・カスタム
          フィールドをテキストとして取り込み)、添付ファイル・メニュー・WordPress内部用の
          投稿タイプは取り込まれません。
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="wxr-file">WordPressエクスポートファイル(.xml)</label>
            <input
              id="wxr-file"
              type="file"
              accept=".xml,text/xml,application/rss+xml"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={!file || importing}>
            {importing ? "インポート中…(サイズによっては数分かかります)" : "インポート実行"}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>インポート結果</h2>

          <div className="actions-row" style={{ marginBottom: "1.25rem" }}>
            <span className="badge badge-published">記事 {result.postsCreated}件</span>
            <span className="badge badge-published">固定ページ {result.pagesCreated}件</span>
            <span className="badge badge-category">カテゴリー(タグ含む) {result.categoriesCreated}件</span>
            <span className="badge badge-category">
              カスタム投稿タイプ {result.postTypesCreated}件
            </span>
            <span className="badge badge-published">
              カスタム投稿タイプのエントリー {result.postTypeEntriesCreated}件
            </span>
            <span className="badge badge-category">
              カスタムブロック定義 {result.blockTypesCreated}件
            </span>
          </div>

          {result.skipped.length > 0 && (
            <>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                スキップ({result.skipped.length}件)
              </h3>
              <ul style={{ marginBottom: "1.25rem", paddingLeft: "1.25rem" }}>
                {result.skipped.map((item, i) => (
                  <li key={i} className="muted" style={{ fontSize: "0.88rem" }}>
                    {item.title} — {item.reason}
                  </li>
                ))}
              </ul>
            </>
          )}

          {result.failed.length > 0 && (
            <>
              <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                失敗({result.failed.length}件)
              </h3>
              <ul style={{ paddingLeft: "1.25rem" }}>
                {result.failed.map((item, i) => (
                  <li key={i} className="error-text" style={{ fontSize: "0.88rem" }}>
                    {item.title} — {item.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
