import { parse, type HTMLElement, type Node } from "node-html-parser";
import type { Block } from "@cms/blocks";

// WordPressのcontent:encoded(投稿本文の生HTML)を、このCMSのBlock[]へ変換します。
// クラシックエディタ・ブロックエディタ(Gutenberg)のどちらも、書き出されるHTMLの構造自体は
// 通常のタグ(<p>, <h2>, <ul>, <figure>...)なので、Gutenbergの<!-- wp:paragraph -->のような
// コメントは単なるHTMLコメントとして無視され、同じロジックで扱える。
//
// このCMSは自由なHTML/リッチテキストを保存しない設計(XSS対策、SPEC.md 8章)のため、
// 太字・リンクなどのインライン装飾は保持できず、プレーンテキストに変換される。
// マッピングできない要素(shortcode、埋め込み、装飾用div等)は、中の画像だけ拾うか、
// それも無ければプレーンテキストの段落として保存する(HTMLタグそのものは絶対に保存しない)。

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === 1;
}

function tagOf(el: HTMLElement): string {
  return el.tagName?.toUpperCase() ?? "";
}

function textOf(node: Node): string {
  return (node.text ?? "").replace(/\s+/g, " ").trim();
}

function blockquoteText(el: HTMLElement): string {
  return el.childNodes
    .filter((c) => !(isElement(c) && tagOf(c) === "CITE"))
    .map((c) => c.text ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function imagesIn(el: HTMLElement): { url: string; alt: string }[] {
  return el
    .querySelectorAll("img")
    .map((img) => ({
      url: (img.getAttribute("src") ?? "").trim(),
      alt: (img.getAttribute("alt") ?? "").trim(),
    }))
    .filter((img) => img.url.length > 0);
}

function convertFigure(el: HTMLElement): Block | null {
  const imgs = imagesIn(el);
  if (imgs.length > 1) {
    return { type: "gallery", images: imgs.map((img) => ({ url: img.url, alt: img.alt })) };
  }
  if (imgs.length === 1) {
    const figcaption = el.querySelector("figcaption");
    return {
      type: "image",
      url: imgs[0].url,
      alt: imgs[0].alt,
      caption: figcaption ? textOf(figcaption) || undefined : undefined,
    };
  }
  return null;
}

function convertElement(el: HTMLElement): Block[] {
  const tag = tagOf(el);

  switch (tag) {
    case "P": {
      // WordPressのGutenbergは画像を<figure>ではなく<p>に直接包むことがあるため、
      // 中身が画像だけならimage/galleryとして扱う。
      const onlyText = el.childNodes.every((c) => !isElement(c) || tagOf(c) !== "IMG");
      if (!onlyText) {
        const imgs = imagesIn(el);
        if (imgs.length > 1) {
          return [{ type: "gallery", images: imgs.map((img) => ({ url: img.url, alt: img.alt })) }];
        }
        if (imgs.length === 1) {
          return [{ type: "image", url: imgs[0].url, alt: imgs[0].alt }];
        }
      }
      const text = textOf(el);
      return text ? [{ type: "paragraph", text }] : [];
    }

    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6": {
      const text = textOf(el);
      if (!text) return [];
      const level = tag === "H1" || tag === "H2" ? 2 : 3;
      return [{ type: "heading", level, text }];
    }

    case "UL":
    case "OL": {
      const items = el
        .querySelectorAll("li")
        .map((li) => textOf(li))
        .filter((t) => t.length > 0);
      return items.length > 0
        ? [{ type: "list", style: tag === "OL" ? "ordered" : "unordered", items }]
        : [];
    }

    case "BLOCKQUOTE": {
      const cite = el.querySelector("cite");
      const text = blockquoteText(el);
      return text ? [{ type: "quote", text, cite: cite ? textOf(cite) || undefined : undefined }] : [];
    }

    case "FIGURE": {
      const block = convertFigure(el);
      return block ? [block] : [];
    }

    case "IMG": {
      const url = (el.getAttribute("src") ?? "").trim();
      if (!url) return [];
      return [{ type: "image", url, alt: (el.getAttribute("alt") ?? "").trim() }];
    }

    // WordPressはブロックごとに<div class="wp-block-...">で包むことが多い。
    // 中に見出し/段落/画像などが1つ以上あれば再帰的に展開し、なければ
    // プレーンテキストの段落にフォールバックする(生HTMLは保存しない)。
    default: {
      const blockLevelChildren = el.childNodes.filter(
        (c) => isElement(c) && KNOWN_BLOCK_TAGS.has(tagOf(c))
      ) as HTMLElement[];
      if (blockLevelChildren.length > 0) {
        return blockLevelChildren.flatMap((child) => convertElement(child));
      }
      const imgs = imagesIn(el);
      if (imgs.length > 1) {
        return [{ type: "gallery", images: imgs.map((img) => ({ url: img.url, alt: img.alt })) }];
      }
      if (imgs.length === 1) {
        return [{ type: "image", url: imgs[0].url, alt: imgs[0].alt }];
      }
      const text = textOf(el);
      return text ? [{ type: "paragraph", text }] : [];
    }
  }
}

const KNOWN_BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "FIGURE",
  "IMG",
]);

export function wpContentToBlocks(html: string): Block[] {
  if (!html || !html.trim()) return [];
  const root = parse(html);
  const blocks: Block[] = [];

  for (const node of root.childNodes) {
    if (!isElement(node)) {
      // トップレベルの裸のテキスト(タグに包まれていない文章)を段落として拾う
      const text = textOf(node);
      if (text) blocks.push({ type: "paragraph", text });
      continue;
    }
    blocks.push(...convertElement(node));
  }

  return blocks;
}
