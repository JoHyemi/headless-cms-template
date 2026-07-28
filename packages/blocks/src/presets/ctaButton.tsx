import { isSafeUrl } from "../normalize";
import type { FieldValue } from "../types";

// カスタムブロック「cta-button」の実装例。管理画面でこのslugのブロックタイプを作成すると
// (フィールド: buttonText/text, buttonUrl/url, highlight/boolean)、このデザインで描画されます。
// BlockRenderer(JSX)とblocksToHtml(外部API向けHTML文字列)の両方に登録して使うため、
// 見た目のロジック(readFields)を1箇所にまとめ、CSSクラス名も共通にしてあります。

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readFields(fields: Record<string, FieldValue>) {
  const buttonText = typeof fields.buttonText === "string" ? fields.buttonText.trim() : "";
  const rawUrl = typeof fields.buttonUrl === "string" ? fields.buttonUrl.trim() : "";
  // javascript:のようなURLはisSafeUrlで弾く — aタグのhrefはクリック時に評価されるため、
  // 画像src以上に慎重に扱う必要がある。
  const buttonUrl = rawUrl && isSafeUrl(rawUrl) ? rawUrl : "";
  const highlight = fields.highlight === true;
  return { buttonText, buttonUrl, highlight };
}

export function CtaButton({ fields }: { fields: Record<string, FieldValue> }) {
  const { buttonText, buttonUrl, highlight } = readFields(fields);
  if (!buttonText || !buttonUrl) return null;

  return (
    <div className={highlight ? "cta-block cta-block-highlight" : "cta-block"}>
      <a href={buttonUrl} className="cta-button">
        {buttonText}
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

export function ctaButtonToHtml(fields: Record<string, FieldValue>): string {
  const { buttonText, buttonUrl, highlight } = readFields(fields);
  if (!buttonText || !buttonUrl) return "";

  const className = highlight ? "cta-block cta-block-highlight" : "cta-block";
  return (
    `<div class="${className}">` +
    `<a href="${escapeHtml(buttonUrl)}" class="cta-button">${escapeHtml(buttonText)} ` +
    `<span aria-hidden="true">→</span></a></div>`
  );
}
