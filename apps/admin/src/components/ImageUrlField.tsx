"use client";

import { useState } from "react";
import { MediaPickerModal } from "./MediaPickerModal";
import type { MediaDTO } from "@/types/api";

type Props = {
  value: string;
  onChange: (url: string) => void;
  // メディア選択時に呼ばれる。url/alt/captionを1回のonChangeでまとめて反映できるよう、
  // onChange(url)とは別のコールバックにしている(複数回に分けて呼ぶと、後の呼び出しが
  // 古いstateを参照して前の変更を打ち消してしまうため)。
  onPick?: (result: { url: string; alt: string; caption: string }) => void;
  placeholder?: string;
};

// メディアの登録済みaltがあればそれを、なければファイル名から読める形のaltを組み立てます
// (例: "team-photo_2026.jpg" → "team photo 2026")。空文字は返さず、必ず何かしら埋まるようにします。
function fallbackAlt(item: MediaDTO): string {
  if (item.alt?.trim()) return item.alt.trim();
  return item.filename.replace(/\.[^./]+$/, "").replace(/[-_]+/g, " ").trim();
}

// キャプションはaltと違って画面に見える編集コンテンツなので、altのようにファイル名から
// でっち上げたりはしない — メディアに登録済みのキャプションがあればそれを使い、なければ空のまま。
function fallbackCaption(item: MediaDTO): string {
  return item.caption?.trim() ?? "";
}

// 画像URL入力欄 + 「メディアから選択」ボタン。既存のアップロード済み画像から選ぶことも、
// 外部の画像URLを直接入力することもできます(値はどちらもただの文字列として保存されます)。
// onPickを渡しておくと、メディアを選択した際にそのalt/キャプションも自動で埋められます。
export function ImageUrlField({ value, onChange, onPick, placeholder }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="actions-row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "画像URL（https://... のみ使用できます）"}
        style={{ flex: 1, minWidth: "160px" }}
      />
      <button type="button" className="btn" onClick={() => setPickerOpen(true)} style={{ flexShrink: 0 }}>
        メディアから選択
      </button>
      {pickerOpen && (
        <MediaPickerModal
          onSelect={(item) => {
            if (onPick) {
              onPick({ url: item.url, alt: fallbackAlt(item), caption: fallbackCaption(item) });
            } else {
              onChange(item.url);
            }
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
