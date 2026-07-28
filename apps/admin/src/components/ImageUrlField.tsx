"use client";

import { useState } from "react";
import { MediaPickerModal } from "./MediaPickerModal";

type Props = {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
};

// 画像URL入力欄 + 「メディアから選択」ボタン。既存のアップロード済み画像から選ぶことも、
// 外部の画像URLを直接入力することもできます(値はどちらもただの文字列として保存されます)。
export function ImageUrlField({ value, onChange, placeholder }: Props) {
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
          onSelect={(url) => {
            onChange(url);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
