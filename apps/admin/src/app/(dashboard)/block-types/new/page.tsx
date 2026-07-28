import { BlockTypeForm } from "@/components/BlockTypeForm";

export default function NewBlockTypePage() {
  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>カスタムブロックの新規作成</h1>
      <BlockTypeForm mode="create" />
    </>
  );
}
