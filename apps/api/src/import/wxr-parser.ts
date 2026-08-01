import { XMLParser } from "fast-xml-parser";

// WordPressの標準エクスポート形式(WXR = WordPress eXtended RSS)を、
// インポート処理で扱いやすい形に正規化するパーサー。
// WXRは実質「RSS + wp:名前空間の独自タグ」で、投稿・固定ページ・添付ファイル(メディア)・
// カテゴリー・タグがすべて<item>として1つのXMLにまとめて書き出される。

export type WxrCategory = { niceName: string; name: string };
export type WxrTag = { slug: string; name: string };

export type WxrItem = {
  title: string;
  slug: string; // wp:post_name
  postType: string; // post | page | attachment | nav_menu_item など
  status: string; // publish | draft | pending | private | future | trash | inherit
  postDate: string; // wp:post_date(サイトのローカル時刻、タイムゾーン情報なし)
  contentHtml: string; // content:encoded — 投稿本文の生HTML
  excerptHtml: string; // excerpt:encoded — 手動要約(未設定なら空文字)
  author: string;
  categorySlugs: string[]; // domain="category"のcategory要素
  tagSlugs: string[]; // domain="post_tag"のcategory要素
  attachmentUrl?: string; // postType==="attachment"の場合のみ
};

export type WxrDocument = {
  siteTitle: string;
  categories: WxrCategory[];
  tags: WxrTag[];
  items: WxrItem[];
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// fast-xml-parserは属性ありタグを{ "#text": ..., "@_attr": ... }、
// 属性なしタグを素の文字列として返すため、両方のケースを吸収する。
function textOf(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

export function parseWxr(xml: string): WxrDocument {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: false,
    trimValues: true,
    isArray: (name) =>
      ["item", "category", "wp:category", "wp:tag", "wp:postmeta"].includes(name),
  });

  const doc = parser.parse(xml) as {
    rss?: { channel?: Record<string, unknown> };
  };
  const channel = doc.rss?.channel;
  if (!channel) {
    throw new Error("WXR形式のXMLとして認識できません(<rss><channel>が見つかりません)。");
  }

  const categories: WxrCategory[] = asArray(
    channel["wp:category"] as Record<string, unknown>[] | undefined
  ).map((c) => ({
    niceName: textOf(c["wp:category_nicename"]),
    name: textOf(c["wp:cat_name"]),
  }));

  const tags: WxrTag[] = asArray(channel["wp:tag"] as Record<string, unknown>[] | undefined).map(
    (t) => ({
      slug: textOf(t["wp:tag_slug"]),
      name: textOf(t["wp:tag_name"]),
    })
  );

  const rawItems = asArray(channel.item as Record<string, unknown>[] | undefined);

  const items: WxrItem[] = rawItems.map((item) => {
    const categoryEls = asArray(item.category as Record<string, unknown>[] | undefined);
    const categorySlugs = categoryEls
      .filter((c) => (c["@_domain"] as string | undefined) === "category")
      .map((c) => (c["@_nicename"] as string | undefined) ?? textOf(c))
      .filter(Boolean);
    const tagSlugs = categoryEls
      .filter((c) => (c["@_domain"] as string | undefined) === "post_tag")
      .map((c) => (c["@_nicename"] as string | undefined) ?? textOf(c))
      .filter(Boolean);

    return {
      title: textOf(item.title),
      slug: textOf(item["wp:post_name"]),
      postType: textOf(item["wp:post_type"]) || "post",
      status: textOf(item["wp:status"]) || "draft",
      postDate: textOf(item["wp:post_date"]),
      contentHtml: textOf(item["content:encoded"]),
      excerptHtml: textOf(item["excerpt:encoded"]),
      author: textOf(item["dc:creator"]) || "Admin",
      categorySlugs,
      tagSlugs,
      attachmentUrl: textOf(item["wp:attachment_url"]) || undefined,
    };
  });

  return {
    siteTitle: textOf(channel.title),
    categories,
    tags,
    items,
  };
}
