import type { ReactNode } from "react";
import type { Block, FieldValue } from "./types";
import { resolveMediaUrl } from "./normalize";

/** カスタムブロックをJSXで描画するコンポーネントをブロックタイプのslugごとに登録するための型。 */
export type CustomBlockComponents = Record<
  string,
  (props: { fields: Record<string, FieldValue> }) => ReactNode
>;

/** 対応するコンポーネントが登録されていないカスタムブロックのフォールバック表示。
 *  値はJSXが自動でエスケープするため、未知のブロックタイプでも安全にラベル:値として表示できる。 */
function CustomBlockFallback({ blockType, fields }: { blockType: string; fields: Record<string, FieldValue> }) {
  const entries = Object.entries(fields).filter(([, value]) => value !== "" && value !== undefined);
  if (entries.length === 0) return null;
  return (
    <dl className="custom-block" data-block-type={blockType}>
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

// ブロック配列をJSXで直接レンダリングします。テキストはReactが自動でエスケープするため、
// dangerouslySetInnerHTMLを使わなくても安全に表示されます。
//
// customComponentsはブロックタイプのslugごとにJSXコンポーネントを登録するための拡張ポイント。
// 未登録のslugはCustomBlockFallback(ラベル:値のリスト)で表示される。
//
// mediaBaseUrlは画像ブロックのurlが/uploads/...のような相対パスの場合に絶対URLへ変換するための
// ベースURL(呼び出し側の環境のAPI_URL)。渡さなければurlをそのまま使う。
export function BlockRenderer({
  blocks,
  customComponents = {},
  mediaBaseUrl,
}: {
  blocks: Block[];
  customComponents?: CustomBlockComponents;
  mediaBaseUrl?: string;
}) {
  return (
    <div className="block-content">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return block.text ? <p key={index}>{block.text}</p> : null;

          case "heading": {
            const Tag = block.level === 2 ? "h2" : "h3";
            return block.text ? <Tag key={index}>{block.text}</Tag> : null;
          }

          case "list": {
            const items = block.items.filter((item) => item.trim());
            if (items.length === 0) return null;
            const ListTag = block.style === "ordered" ? "ol" : "ul";
            return (
              <ListTag key={index}>
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ListTag>
            );
          }

          case "quote":
            return block.text ? (
              <blockquote key={index}>
                <p>{block.text}</p>
                {block.cite && <cite>— {block.cite}</cite>}
              </blockquote>
            ) : null;

          case "image":
            return block.url ? (
              <figure key={index}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveMediaUrl(block.url, mediaBaseUrl)} alt={block.alt} />
                {block.caption && <figcaption className="muted">{block.caption}</figcaption>}
              </figure>
            ) : null;

          case "gallery": {
            const images = block.images.filter((image) => image.url);
            if (images.length === 0) return null;
            return (
              <div className="gallery" key={index}>
                {images.map((image, i) => (
                  <figure key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveMediaUrl(image.url, mediaBaseUrl)} alt={image.alt} />
                    {image.caption && <figcaption className="muted">{image.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            );
          }

          case "custom": {
            const Custom = customComponents[block.blockType];
            return (
              <div key={index}>
                {Custom ? (
                  <Custom fields={block.fields} />
                ) : (
                  <CustomBlockFallback blockType={block.blockType} fields={block.fields} />
                )}
              </div>
            );
          }
        }
      })}
    </div>
  );
}
