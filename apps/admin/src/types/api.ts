import type { Block, FieldDef } from "@cms/blocks";

export type BlockTypeDTO = {
  id: string;
  name: string;
  slug: string;
  fields: FieldDef[];
  createdAt: string;
};

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count?: { posts: number };
};

export type MediaDTO = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  alt: string | null;
  caption: string | null;
  createdAt: string;
};

export type PostDTO = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: Block[];
  contentHtml: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED";
  publishAt: string | null;
  author: string;
  createdAt: string;
  updatedAt: string;
  categories: CategoryDTO[];
};
