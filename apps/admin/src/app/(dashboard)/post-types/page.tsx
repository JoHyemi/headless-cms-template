import Link from "next/link";
import { serverApiFetch } from "@/lib/api-server";
import { PostTypeActions } from "@/components/PostTypeActions";
import type { PostTypeDTO } from "@/types/api";

// カスタム投稿タイプ管理画面: WordPressのCustom Post Type一覧に相当します。
export default async function PostTypesPage() {
  const res = await serverApiFetch("/post-types");
  const { postTypes } = (await res.json()) as { postTypes: PostTypeDTO[] };

  return (
    <>
      <div className="page-title-row">
        <h1>カスタム投稿タイプ</h1>
        <Link href="/post-types/new" className="btn btn-primary">
          + 新規作成
        </Link>
      </div>

      <p className="hint" style={{ marginBottom: "1.5rem" }}>
        記事(Post)とは別に、「商品」「お客様の声」のような独自の構造を持つコンテンツタイプを
        ここで定義できます。定義後は「エントリー管理」から実際のデータを作成でき、
        <code>GET /post-types/{"{"}slug{"}"}</code> のAPIで公開データを取得できます。
      </p>

      {postTypes.length === 0 ? (
        <p className="empty-state">
          まだカスタム投稿タイプがありません。「+ 新規作成」から追加してみてください。
        </p>
      ) : (
        postTypes.map((postType) => (
          <div key={postType.id} className="card">
            <div className="page-title-row" style={{ marginBottom: 0 }}>
              <div>
                <strong>{postType.name}</strong>
                <p className="muted">
                  /{postType.slug} · フィールド{postType.fields.length}件 · エントリー
                  {postType._count?.entries ?? 0}件
                </p>
              </div>
              <PostTypeActions id={postType.id} slug={postType.slug} />
            </div>
          </div>
        ))
      )}
    </>
  );
}
