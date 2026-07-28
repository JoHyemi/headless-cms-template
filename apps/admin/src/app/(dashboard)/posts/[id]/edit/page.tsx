import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { PostForm } from "@/components/PostForm";
import type { BlockTypeDTO, CategoryDTO, PostDTO } from "@/types/api";

type Props = { params: Promise<{ id: string }> };

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const [postRes, categoriesRes, blockTypesRes] = await Promise.all([
    serverApiFetch(`/posts/${id}`),
    serverApiFetch("/categories"),
    serverApiFetch("/block-types"),
  ]);

  if (postRes.status === 404) {
    notFound();
  }

  const post = (await postRes.json()) as PostDTO;
  const { categories } = (await categoriesRes.json()) as { categories: CategoryDTO[] };
  const { blockTypes } = (await blockTypesRes.json()) as { blockTypes: BlockTypeDTO[] };

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>記事の編集</h1>
      <PostForm mode="edit" post={post} allCategories={categories} blockTypes={blockTypes} />
    </>
  );
}
