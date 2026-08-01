import { PostTypeForm } from "@/components/PostTypeForm";

export default function NewPostTypePage() {
  return (
    <>
      <h1 style={{ marginBottom: "1.5rem" }}>カスタム投稿タイプの新規作成</h1>
      <PostTypeForm mode="create" />
    </>
  );
}
