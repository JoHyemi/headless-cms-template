import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

async function main() {
  const site =
    (await prisma.site.findFirst()) ??
    (await prisma.site.create({ data: { name: "Headless CMS", domain: "localhost" } }));

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me";
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        name: "Admin",
      },
    });
    console.log(`管理者アカウントを作成しました: ${adminEmail}`);
  }

  const postCount = await prisma.post.count();
  if (postCount > 0) {
    console.log(`既に${postCount}件の記事があるためコンテンツのシードをスキップします。`);
    return;
  }

  const categories = await Promise.all(
    [
      { name: "お知らせ", slug: "お知らせ" },
      { name: "コラム", slug: "コラム" },
      { name: "製品情報", slug: "製品情報" },
      { name: "アップデート", slug: "アップデート" },
    ].map((c) => prisma.category.create({ data: { ...c, siteId: site.id } }))
  );
  const [announcements, column, productInfo, updates] = categories;

  await prisma.post.create({
    data: {
      siteId: site.id,
      title: "ヘッドレスCMSへようこそ",
      slug: "welcome-to-headless-cms",
      excerpt: "Next.jsで作ったWordPressスタイルのヘッドレスCMSの最初のサンプル記事です。",
      content: [
        { type: "paragraph", text: "この記事はシードデータとして生成されたサンプル記事です。" },
        { type: "heading", level: 2, text: "ブロックエディタで作成されています" },
        {
          type: "paragraph",
          text: "管理画面で新しい記事を作成し、公開するかどうかを選択できます。",
        },
        {
          type: "list",
          style: "unordered",
          items: [
            "公開された記事はホーム画面に表示されます。",
            "GET /posts?status=PUBLISHED 相当のAPIでも取得できます。",
          ],
        },
      ],
      status: "PUBLISHED",
      author: "Admin",
    },
  });

  await prisma.post.create({
    data: {
      siteId: site.id,
      title: "この記事はまだ下書き状態です",
      slug: "this-is-a-draft",
      excerpt: "DRAFT状態の記事は公開ホーム画面には表示されません。",
      content: [
        {
          type: "paragraph",
          text: "下書き(DRAFT)状態の記事は管理画面の一覧にのみ表示され、公開ホーム画面や公開APIの結果には表れません。",
        },
        { type: "quote", text: "管理画面で「公開する」ボタンを押すと公開されます。", cite: "Admin" },
      ],
      status: "DRAFT",
      author: "Admin",
      categories: { connect: [{ id: productInfo.id }, { id: announcements.id }] },
    },
  });

  await prisma.post.create({
    data: {
      siteId: site.id,
      title: "ブロックエディタの動作確認",
      slug: "block-editor-check",
      excerpt: "ブロックエディタの各ブロックが正しく表示されるかを確認するためのサンプル記事です。",
      content: [
        {
          type: "paragraph",
          text: "このページはブロックエディタの各ブロックが正しく表示されるかを確認するためのサンプルです。",
        },
        { type: "heading", level: 3, text: "見出しサンプル" },
        { type: "paragraph", text: "見出しの下に文章を続けて配置できます。" },
        {
          type: "list",
          style: "unordered",
          items: ["リスト項目1", "リスト項目2", "リスト項目3"],
        },
        { type: "quote", text: "このように引用文を挿入することもできます。", cite: "編集部" },
      ],
      status: "PUBLISHED",
      author: "Admin",
      categories: { connect: [{ id: updates.id }] },
    },
  });

  await prisma.post.create({
    data: {
      siteId: site.id,
      title: "ブロックエディタのご紹介",
      slug: "block-editor-intro",
      excerpt: "ブロックエディタで作成された記事の紹介サンプルです。",
      content: [
        { type: "paragraph", text: "この文章はブロックエディタで作成されました。" },
        { type: "heading", level: 2, text: "テストの見出しです" },
        {
          type: "list",
          style: "unordered",
          items: ["最初の項目", "二番目の項目", "三番目の項目"],
        },
      ],
      status: "PUBLISHED",
      author: "Admin",
    },
  });

  await prisma.post.create({
    data: {
      siteId: site.id,
      title: "こんにちは",
      slug: "hello-sample",
      excerpt: "レガシー形式の本文が安全にエスケープされることを確認するサンプルです。",
      content: [{ type: "paragraph", text: "これは\n<h1>見出しテキスト</h1>です" }],
      status: "PUBLISHED",
      author: "Admin",
      categories: { connect: [{ id: column.id }] },
    },
  });

  console.log("シードデータの作成が完了しました: Site 1件, 記事5件, カテゴリー4件");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
