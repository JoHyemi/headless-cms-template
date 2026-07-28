import { serverApiFetch } from "@/lib/api-server";
import { PostForm } from "@/components/PostForm";
import type { BlockTypeDTO, CategoryDTO } from "@/types/api";

export default async function NewPostPage() {
  const [categoriesRes, blockTypesRes] = await Promise.all([
    serverApiFetch("/categories"),
    serverApiFetch("/block-types"),
  ]);
  const { categories } = (await categoriesRes.json()) as { categories: CategoryDTO[] };
  const { blockTypes } = (await blockTypesRes.json()) as { blockTypes: BlockTypeDTO[] };

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>新規投稿</h1>
      <PostForm mode="create" allCategories={categories} blockTypes={blockTypes} />
    </>
  );
}
