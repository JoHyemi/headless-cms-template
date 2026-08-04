import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { PostTypeEntryForm } from "@/components/PostTypeEntryForm";
import type { CategoryDTO, PostTypeDTO, PostTypeEntryDTO } from "@/types/api";

type Props = { params: Promise<{ typeSlug: string; id: string }> };

export default async function EditEntryPage({ params }: Props) {
  // Next.jsのルートパラメータはURLエンコードされたまま渡される(自動デコードされない)ため、
  // 一度decodeURIComponentしてから使う(entries/[typeSlug]/page.tsxと同じ理由)。
  const { typeSlug: rawTypeSlug, id } = await params;
  const typeSlug = decodeURIComponent(rawTypeSlug);
  const [entryRes, categoriesRes] = await Promise.all([
    serverApiFetch(`/post-types/${encodeURIComponent(typeSlug)}/${id}`),
    serverApiFetch("/categories"),
  ]);
  if (entryRes.status === 404) notFound();

  const { postType, entry } = (await entryRes.json()) as {
    postType: PostTypeDTO;
    entry: PostTypeEntryDTO;
  };
  const { categories } = (await categoriesRes.json()) as { categories: CategoryDTO[] };

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>{postType.name}の編集</h1>
      <PostTypeEntryForm mode="edit" postType={postType} entry={entry} allCategories={categories} />
    </>
  );
}
