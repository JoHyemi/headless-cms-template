import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { PostTypeForm } from "@/components/PostTypeForm";
import type { PostTypeDTO } from "@/types/api";

type Props = { params: Promise<{ id: string }> };

export default async function EditPostTypePage({ params }: Props) {
  const { id } = await params;

  // GET /post-types/:id は無いため、一覧から探します(block-typesと同様、件数が少ない前提のV1向けの簡易対応)。
  const res = await serverApiFetch("/post-types");
  const { postTypes } = (await res.json()) as { postTypes: PostTypeDTO[] };
  const postType = postTypes.find((pt) => pt.id === id);

  if (!postType) {
    notFound();
  }

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>カスタム投稿タイプの編集</h1>
      <PostTypeForm mode="edit" postType={postType} />
    </>
  );
}
