import { serverApiFetch } from "@/lib/api-server";
import { CategoryForm } from "@/components/CategoryForm";
import { CategoryActions } from "@/components/CategoryActions";
import type { CategoryDTO } from "@/types/api";

// 管理者カテゴリー管理画面: WordPressの「カテゴリー」メニューと同じ役割です。
export default async function AdminCategoriesPage() {
  const res = await serverApiFetch("/categories");
  const { categories } = (await res.json()) as { categories: CategoryDTO[] };

  return (
    <>
      <div className="page-title-row">
        <h1>カテゴリー管理</h1>
      </div>

      <CategoryForm />

      {categories.length === 0 ? (
        <p className="empty-state">まだカテゴリーがありません。上から新しいカテゴリーを追加してみてください。</p>
      ) : (
        categories.map((category) => (
          <div key={category.id} className="card">
            <div className="page-title-row" style={{ marginBottom: 0 }}>
              <div>
                <strong>{category.name}</strong>
                <p className="muted">
                  /{category.slug} · 記事{category._count?.posts ?? 0}件
                </p>
              </div>
              <CategoryActions id={category.id} postCount={category._count?.posts ?? 0} />
            </div>
          </div>
        ))
      )}
    </>
  );
}
