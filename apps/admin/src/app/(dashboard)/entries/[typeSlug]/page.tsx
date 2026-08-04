import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/api-server";
import { PostTypeEntryList } from "@/components/PostTypeEntryList";
import type { PostTypeDTO, PostTypeEntryDTO } from "@/types/api";

type Props = { params: Promise<{ typeSlug: string }> };

// カスタム投稿タイプのエントリー一覧。WordPressの投稿タイプ別一覧画面に相当します。
export default async function EntriesPage({ params }: Props) {
  // Next.jsのルートパラメータはURLエンコードされたまま渡される(自動デコードされない)ため、
  // ここで一度decodeURIComponentしてから、以降はこのCMS内で扱う「生のslug」として統一する
  // (fetchパス/Linkのhrefを組み立てる際はその都度encodeURIComponentし直す)。
  const { typeSlug: rawTypeSlug } = await params;
  const typeSlug = decodeURIComponent(rawTypeSlug);
  const res = await serverApiFetch(`/post-types/${encodeURIComponent(typeSlug)}/all`);
  if (res.status === 404) notFound();

  const { postType, entries } = (await res.json()) as {
    postType: PostTypeDTO;
    entries: PostTypeEntryDTO[];
  };

  return (
    <>
      <div className="page-title-row">
        <div>
          <h1>{postType.name}</h1>
          <p className="muted">/{postType.slug}</p>
        </div>
        <Link href={`/entries/${encodeURIComponent(typeSlug)}/new`} className="btn btn-primary">
          + 新規作成
        </Link>
      </div>

      <PostTypeEntryList typeSlug={typeSlug} entries={entries} />
    </>
  );
}
