# CMSの設計方針

github: https://github.com/JoHyemi/headless-cms-template

## 基本方針

本CMSはWordPressと同じく「1 CMS = 1 Site」構造を基本とする。
各サイトは独立したCMSインスタンス(リポジトリ)を持ち、プロジェクトごとに別々の管理者・データ・設定を管理する。

```
Company A CMS              Company B CMS
 ├── Admin                   ├── Admin
 ├── API                     ├── API
 ├── Database                ├── Database
 └── Frontend                └── Frontend
```

この構造を採用する理由:

- 設計がシンプルである
- 権限管理がシンプルである
- サイトごとの設定分離がしやすい
- WordPressに似た運用方式である
- 保守がしやすい

## 技術スタック

### Admin

Next.js / React / TypeScript

管理画面はNext.jsベースで開発する。管理画面はAPIを直接呼び出してデータを管理し、
コンテンツの修正は管理画面から行う。

### API(Backend)

NestJS / Prisma / PostgreSQL

NestJSはREST APIを提供し、ビジネスロジックとデータ管理を担当する。PrismaはORMとして使用する。

### Frontend(公開サイト)

V1では `apps/website` としてAdmin/APIと同じモノレポ内にNext.jsで実装している。
設計上はCMS APIだけを呼び出す独立したクライアントなので、将来的に別リポジトリ・
別フレームワーク(Vue、Astroなど)へ差し替えることも可能な構造にしている。

---

## AdminとFrontendの分離

管理画面(Admin)と公開サイト(Frontend)は別々のNext.jsアプリである。

```
Admin (Next.js)        Frontend (Next.js)
       │                      │
       └──────────┬───────────┘
                   ▼
              REST API (NestJS)
                   │
              PostgreSQL (Prisma)
```

管理者はAdminだけを使用し、利用者はFrontendだけにアクセスする。
両者ともデータベースには直接アクセスせず、必ずAPIを経由する。

---

## API設計の原則

APIはFrontendとの契約(Contract)である。
Frontendはデータベースの構造を知る必要がなく、API仕様だけを信頼して開発する。

実際のレスポンス例(`GET /posts/slug/:slug`):

```json
{
  "id": "cms3a8n6t0000yv0fbfob6xce",
  "title": "...",
  "slug": "...",
  "status": "PUBLISHED",
  "content": [{ "type": "paragraph", "text": "..." }],
  "contentHtml": "<p>...</p>",
  "createdAt": "...",
  "updatedAt": "..."
}
```

- `id` はPrismaのcuid(文字列)。連番の数値IDではない。
- `content` はブロック配列(`Block[]`)、`contentHtml` はサーバー側で事前生成した完成済みHTML。
  どちらも同じレスポンスに含まれ、用途に応じて選べる。
- 公開状態は `publishedAt` のような日時ではなく、`status`(`DRAFT` / `PUBLISHED`)で管理する。

ブロックエディタ・カスタムブロックの詳細な設計は [`SPEC.md`](./SPEC.md) を参照。

DB構造が変更されても、APIレスポンスの形式はできる限り維持する。API変更は互換性を考慮して慎重に行う。

---

## データベース設計の原則

DB構造はAPIとは独立して管理する。FrontendはDBに直接アクセスしない。

```
Frontend → API(DTO) → Service → Prisma → PostgreSQL
```

ビジネスロジックはServiceレイヤーで処理する。

---

## 将来の拡張性

現バージョン(V1)は単一サイトをサポートする。
ただし、データモデルは将来Multi-siteをサポートできるように設計する。

```
Site
 ├── id
 ├── name
 └── domain

Post
 ├── id
 ├── siteId
 ├── title
 └── content
```

V1ではSiteを1つだけ作成するよう制限する。将来Multi-siteが必要になった場合、
以下を追加して拡張できるようにする。

- Site管理機能
- プロジェクトごとの権限管理
- プロジェクト選択UI

---

## 開発原則

- コンテンツと画面を分離する
- API中心に設計する。FrontendはAPIだけを使用し、DB構造をFrontendに露出しない
- APIの互換性を最大限維持する
- 再利用可能なコンポーネント中心に開発する
- WordPressのコンテンツ管理の経験(Post, Page, Taxonomyなど)を参考にするが、
  WordPressの構造をそのまま模倣しない
- V1では機能よりシンプルさと保守性を優先する

---

## CMS運用方式(V1)

### 目標

- 1 CMS = 1 Website。WordPressのようにサイトごとに独立したCMSを持つ
- GitHub Actionsを使って自動デプロイする

### プロジェクト作成

共通テンプレートリポジトリを1つ作る(`headless-cms-template`)。
新しいサイトを作る時は、GitHubの `Use this template` 機能で新しいリポジトリを作成する。

```
headless-cms-template
        │
        ├── Use this template
        ▼
company-a
```

### プロジェクト構造

```
company-a
apps/
├── admin      (Next.js)
├── api        (NestJS)
└── website    (Next.js)
packages/
.github/
```

- `admin`: 管理者(CMS)
- `api`: REST API
- `website`: 公開サイト

### デプロイ

```
mainブランチにPush
  ↓
GitHub Actions実行
  ↓
サーバーに自動デプロイ
  ↓
サイトとCMSが一緒に稼働
```

### 運用

管理者は `admin.company-a.com` でログインし、記事作成・ページ作成・画像アップロードを行う。
公開サイトは `company-a.com` でAPIを呼び出してコンテンツを表示する。

### メリット

- サイトごとに完全に独立、DBもプロジェクトごとに分離
- 障害が他のサイトに影響を与えない
- WordPressに似た運用方式
- GitHub Actionsで自動デプロイ可能

---

## 将来(V2)

共通機能が多くなったら `headless-cms-core` を別パッケージとして切り出し、
複数のプロジェクトで共有できるように改善する。
V1ではTemplate Repositoryベースで始めるのが最もシンプルで保守しやすい。

---

## クイックスタート

```bash
git clone https://github.com/JoHyemi/headless-cms-template.git
cp .env.example .env
docker compose up -d
npm run prisma:migrate
```

- `http://localhost:3000` — Website
- `http://localhost:3001` — Admin

---

## V1スコープまとめ

|項目|内容|
|-|-|
|目的|WordPressを代替する自前のHeadless CMS開発|
|技術スタック|Next.js / NestJS / Prisma / PostgreSQL|
|対応済み|ログイン, Post(Block Editor + Custom Block), Page, カスタム投稿タイプ, 予約公開, Media, Category, API, Website, WordPressインポート|
|V1除外|Plugin, Theme, Multi Site|
|今後の予定|[`SPEC.md`](./SPEC.md) の12章(今後検討する機能)を参照|
