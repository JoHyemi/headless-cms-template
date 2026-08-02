import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { PageForm } from "@/components/PageForm";
import type { BlockTypeDTO, PageDTO } from "@/types/api";

type Props = { params: Promise<{ id: string }> };

export default async function EditPagePage({ params }: Props) {
  const { id } = await params;
  const [pageRes, blockTypesRes] = await Promise.all([
    serverApiFetch(`/pages/${id}`),
    serverApiFetch("/block-types"),
  ]);

  if (pageRes.status === 404) {
    notFound();
  }

  const page = (await pageRes.json()) as PageDTO;
  const { blockTypes } = (await blockTypesRes.json()) as { blockTypes: BlockTypeDTO[] };

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>固定ページの編集</h1>
      <PageForm mode="edit" page={page} blockTypes={blockTypes} />
    </>
  );
}
