import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { BlockTypeForm } from "@/components/BlockTypeForm";
import type { BlockTypeDTO } from "@/types/api";

type Props = { params: Promise<{ id: string }> };

export default async function EditBlockTypePage({ params }: Props) {
  const { id } = await params;

  // GET /block-types/:id は無いため、一覧から探します(件数が少ない前提のV1向けの簡易対応)。
  const res = await serverApiFetch("/block-types");
  const { blockTypes } = (await res.json()) as { blockTypes: BlockTypeDTO[] };
  const blockType = blockTypes.find((bt) => bt.id === id);

  if (!blockType) {
    notFound();
  }

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>カスタムブロックの編集</h1>
      <BlockTypeForm mode="edit" blockType={blockType} />
    </>
  );
}
