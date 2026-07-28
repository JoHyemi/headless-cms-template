CMSの設計方針
基本方針
本CMSはWordPressと同じく「1 CMS = 1 Site」構造を基本とする。
各サイトは独立したCMSインスタンスを持ち、プロジェクトごとに別々の管理者・データ・設定を管理する。
Company A CMS
 ├── Admin
 ├── API
 ├── Database
 └── Frontend

Company B CMS
 ├── Admin
 ├── API
 ├── Database
 └── Frontend
この構造を採用する理由は以下の通り。
設計がシンプルである。
権限管理がシンプルである。
サイトごとの設定分離がしやすい。
WordPressに似た運用方式である。
保守がしやすい。

技術スタック
Admin
Next.js
React
TypeScript
管理画面はNext.jsベースで開発する。
管理画面はAPIを直接呼び出してデータを管理し、コンテンツの修正は管理画面から行う。
Backend
NestJS
Prisma
PostgreSQL
NestJSはREST APIを提供し、ビジネスロジックとデータ管理を担当する。
PrismaはORMとして使用する。
Frontend
公開サイトはCMSとは別のプロジェクトとして開発する。
フロントエンドは以下のような技術を自由に使用できる。
Next.js
React
Vue
Astro
HTML
その他のFramework
FrontendはCMS APIだけを呼び出して画面を構成する。

AdminとFrontendの分離
管理画面(Admin)と公開サイト(Frontend)は別々のプロジェクトである。
Admin (Next.js)
        │
        ▼
     REST API
        │
     NestJS
        │
 PostgreSQL
        │
        ▼
Frontend
管理者はAdminだけを使用し、
利用者はFrontendだけにアクセスする。

API設計の原則
APIはFrontendとの契約(Contract)である。
Frontendはデータベースの構造を知る必要がなく、API仕様だけを信頼して開発する。
例
GET /posts/1

Response

{
  "id": 1,
  "title": "...",
  "content": "...",
  "thumbnail": "...",
  "publishedAt": "..."
}
DB構造が変更されても、APIレスポンスの形式はできる限り維持する。
API変更は互換性を考慮して慎重に行う。

データベース設計の原則
DB構造はAPIとは独立して管理する。
FrontendはDBに直接アクセスしない。
Frontend
    │
API(DTO)
    │
Service
    │
Prisma
    │
PostgreSQL
ビジネスロジックはServiceレイヤーで処理する。

将来の拡張性
現バージョン(V1)は単一サイトをサポートする。
ただし、データモデルは将来Multi-siteをサポートできるように設計する。
例
Site
 ├── id
 ├── name
 └── domain

Post
 ├── id
 ├── siteId
 ├── title
 └── content
V1ではSiteを1つだけ作成するよう制限する。
将来Multi-siteが必要になった場合、
Site管理機能
プロジェクトごとの権限管理
プロジェクト選択UI
などを追加して拡張できるようにする。

開発原則
コンテンツと画面を分離する。
API中心に設計する。
FrontendはAPIだけを使用する。
DB構造をFrontendに露出しない。
APIの互換性を最大限維持する。
再利用可能なコンポーネント中心に開発する。
WordPressのコンテンツ管理の経験(Post, Page, Custom Post Type, Taxonomyなど)を参考にするが、WordPressの構造をそのまま模倣しない。
V1では機能よりシンプルさと保守性を優先する。

CMS運用方式(V1)
目標
1 CMS = 1 Website
WordPressのようにサイトごとに独立したCMSを持つ。
GitHub Actionsを使って自動デプロイする。

プロジェクト作成
共通テンプレートリポジトリを1つ作る。
headless-cms-template
新しいサイトを作る時は、GitHubのUse this template機能で新しいリポジトリを作成する。
例
headless-cms-template
        │
        ├── Use this template
        ▼
company-a

プロジェクト構造
company-a

apps/
├── admin      (Next.js)
├── api        (NestJS)
└── website    (Next.js)

packages/
.github/
admin : 管理者(CMS)
api : REST API
website : 公開サイト

デプロイ
mainブランチにPush
↓
GitHub Actions実行
↓
EC2(またはサーバー)に自動デプロイ
↓
サイトとCMSが一緒に稼働

運用
管理者は
cms.company-a.com
で
ログイン
記事作成
ページ作成
画像アップロード
を行う。
公開サイトは
company-a.com
でAPIを呼び出してコンテンツを表示する。

メリット
サイトごとに完全に独立
DBもプロジェクトごとに分離
障害が他のサイトに影響を与えない
WordPressに似た運用方式
GitHub Actionsで自動デプロイ可能

将来(V2)
共通機能が多くなったら
headless-cms-core
を別パッケージとして切り出し、複数のプロジェクトで共有できるように改善する。
V1ではTemplate Repositoryベースで始めるのが最もシンプルで保守しやすい。



目標:
git clone https://github.com/your-org/headless-cms-template.git

cp .env.example .env

docker compose up -d

npm run prisma:migrate

# アクセス
http://localhost:3000  (Website)
http://localhost:3001  (Admin)

アーキテクチャ
                GitHub
                   │
          GitHub Actions
                   │
         ┌─────────┴─────────┐
         │                   │
      Admin              Website
    (Next.js)           (Next.js)
         │                   │
         └─────────┬─────────┘
                   │
              NestJS API
                   │
             PostgreSQL

1. 目的

WordPressを代替する自前のHeadless CMS開発

2. 技術スタック

Next.js
NestJS
Prisma
PostgreSQL

3. MVPの範囲

- ログイン
- Post
- Page
- Media
- Category
- API
- Website

4. 除外

- Plugin
- Theme
- Multi Site

5. 今後の予定

- Custom Post Type
- Workflow
- Version History
