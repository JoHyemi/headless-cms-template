import { serverApiFetch } from "@/lib/api-server";
import { PostForm } from "@/components/PostForm";
import type { CategoryDTO } from "@/types/api";

export default async function NewPostPage() {
  const res = await serverApiFetch("/categories");
  const { categories } = (await res.json()) as { categories: CategoryDTO[] };

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>新規投稿</h1>
      <PostForm mode="create" allCategories={categories} />
    </>
  );
}
