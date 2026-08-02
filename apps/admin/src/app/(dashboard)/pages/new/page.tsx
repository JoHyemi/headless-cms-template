import { serverApiFetch } from "@/lib/api-server";
import { PageForm } from "@/components/PageForm";
import type { BlockTypeDTO } from "@/types/api";

export default async function NewPagePage() {
  const blockTypesRes = await serverApiFetch("/block-types");
  const { blockTypes } = (await blockTypesRes.json()) as { blockTypes: BlockTypeDTO[] };

  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>固定ページの新規作成</h1>
      <PageForm mode="create" blockTypes={blockTypes} />
    </>
  );
}
