import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { PostTypeEntryForm } from "@/components/PostTypeEntryForm";
import type { PostTypeDTO, PostTypeEntryDTO } from "@/types/api";

type Props = { params: Promise<{ typeSlug: string; id: string }> };

export default async function EditEntryPage({ params }: Props) {
  const { typeSlug, id } = await params;
  const res = await serverApiFetch(`/post-types/${encodeURIComponent(typeSlug)}/${id}`);
  if (res.status === 404) notFound();

  const { postType, entry } = (await res.json()) as {
    postType: PostTypeDTO;
    entry: PostTypeEntryDTO;
  };

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>{postType.name}の編集</h1>
      <PostTypeEntryForm mode="edit" postType={postType} entry={entry} />
    </>
  );
}
