"use client";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

// ページ遷移(URL変更)なしにページ番号だけを切り替えるページネーション。
export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="actions-row" style={{ justifyContent: "center", marginTop: "1.5rem" }}>
      <button
        type="button"
        className="btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← 前へ
      </button>
      <span className="muted">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        className="btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        次へ →
      </button>
    </div>
  );
}
