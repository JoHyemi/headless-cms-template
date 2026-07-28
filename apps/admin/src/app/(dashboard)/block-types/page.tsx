import Link from "next/link";
import { serverApiFetch } from "@/lib/api-server";
import { BlockTypeActions } from "@/components/BlockTypeActions";
import type { BlockTypeDTO } from "@/types/api";

// カスタムブロック管理画面: ACFの「フィールドグループ」一覧に相当します。
export default async function BlockTypesPage() {
  const res = await serverApiFetch("/block-types");
  const { blockTypes } = (await res.json()) as { blockTypes: BlockTypeDTO[] };

  return (
    <>
      <div className="page-title-row">
        <h1>カスタムブロック</h1>
        <Link href="/block-types/new" className="btn btn-primary">
          + 新規作成
        </Link>
      </div>

      <p className="hint" style={{ marginBottom: "1.5rem" }}>
        ここで定義したフィールド構成は記事編集画面のブロック一覧に追加されます。実際の見た目
        (HTML/デザイン)は開発者がこのブロックタイプのslug用にレンダラーを登録するまでは、
        ラベルと値の簡易表示になります。
      </p>

      {blockTypes.length === 0 ? (
        <p className="empty-state">
          まだカスタムブロックがありません。「+ 新規作成」から追加してみてください。
        </p>
      ) : (
        blockTypes.map((blockType) => (
          <div key={blockType.id} className="card">
            <div className="page-title-row" style={{ marginBottom: 0 }}>
              <div>
                <strong>{blockType.name}</strong>
                <p className="muted">
                  /{blockType.slug} · フィールド{blockType.fields.length}件
                </p>
              </div>
              <BlockTypeActions id={blockType.id} />
            </div>
          </div>
        ))
      )}
    </>
  );
}
