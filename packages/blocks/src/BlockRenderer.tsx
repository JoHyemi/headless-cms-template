import type { Block } from "./types";

// 블록 배열을 JSX로 직접 렌더링합니다. 텍스트는 React가 자동으로 이스케이프하므로
// dangerouslySetInnerHTML 없이도 안전하게 표시됩니다.
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
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
                <img src={block.url} alt={block.alt} />
                {block.caption && <figcaption className="muted">{block.caption}</figcaption>}
              </figure>
            ) : null;
        }
      })}
    </div>
  );
}
