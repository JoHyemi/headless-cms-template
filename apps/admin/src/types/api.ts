import type { Block } from "@cms/blocks";

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
  createdAt: string;
};

export type PostDTO = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: Block[];
  contentHtml: string;
  status: "DRAFT" | "PUBLISHED";
  author: string;
  createdAt: string;
  updatedAt: string;
  categories: CategoryDTO[];
};
