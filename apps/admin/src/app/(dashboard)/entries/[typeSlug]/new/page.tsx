import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { PostTypeEntryForm } from "@/components/PostTypeEntryForm";
import type { PostTypeDTO } from "@/types/api";

type Props = { params: Promise<{ typeSlug: string }> };

export default async function NewEntryPage({ params }: Props) {
  const { typeSlug } = await params;
  const res = await serverApiFetch(`/post-types/${encodeURIComponent(typeSlug)}/all`);
  if (res.status === 404) notFound();

  const { postType } = (await res.json()) as { postType: PostTypeDTO };

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>{postType.name}の新規作成</h1>
      <PostTypeEntryForm mode="create" postType={postType} />
    </>
  );
}
