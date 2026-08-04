import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { PostTypeEntryForm } from "@/components/PostTypeEntryForm";
import type { CategoryDTO, PostTypeDTO } from "@/types/api";

type Props = { params: Promise<{ typeSlug: string }> };

export default async function NewEntryPage({ params }: Props) {
  // Next.jsのルートパラメータはURLエンコードされたまま渡される(自動デコードされない)ため、
  // 一度decodeURIComponentしてから使う(entries/[typeSlug]/page.tsxと同じ理由)。
  const { typeSlug: rawTypeSlug } = await params;
  const typeSlug = decodeURIComponent(rawTypeSlug);
  const [entryRes, categoriesRes] = await Promise.all([
    serverApiFetch(`/post-types/${encodeURIComponent(typeSlug)}/all`),
    serverApiFetch("/categories"),
  ]);
  if (entryRes.status === 404) notFound();

  const { postType } = (await entryRes.json()) as { postType: PostTypeDTO };
  const { categories } = (await categoriesRes.json()) as { categories: CategoryDTO[] };

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>{postType.name}の新規作成</h1>
      <PostTypeEntryForm mode="create" postType={postType} allCategories={categories} />
    </>
  );
}
