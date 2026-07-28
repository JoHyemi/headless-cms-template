# Headless CMS

WordPressのように **「1 CMS = 1 Site」** 構造に従うヘッドレス(headless) CMSです。
設計方針は [`structure.md`](./structure.md) を参考にしており、管理画面(Admin)・API(Backend)・
公開サイト(Website)を完全に分離した別々のアプリとして運用します。
データモデル・API・セキュリティなどの詳細仕様は [`SPEC.md`](./SPEC.md) を参照してください。

- **管理画面(Admin)**: ログイン後に記事(Post)・カテゴリー・メディア・カスタムブロックを作成/管理します。
- **API**: NestJSで作られたREST API。AdminとWebsiteはこのAPIだけを呼び出し、DBの構造を直接知りません。
- **公開サイト(Website)**: 公開(PUBLISHED)された記事だけをAPI経由で表示する、完全に別のフロントエンドです。

## 主な機能

- **ブロックエディタ**: 段落・見出し・リスト・引用・画像・画像ギャラリーの6種類の決まったブロックを
  組み合わせて記事を作成。自由なHTML/Markdownを直接保存しないため、保存段階からXSSが入り込めません。
- **カスタムブロック(ACFスタイル)**: 管理画面の「カスタムブロック」画面で、名前とフィールド構成
  (テキスト/複数行テキスト/数値/はい・いいえ/URL/画像URL)を決めるだけで、記事編集画面に新しい
  ブロックタイプを追加できます。「必須」に設定したフィールドが空のまま保存されようとすると、
  ブロックがどれの何のフィールドか名指しでエラーになり保存がブロックされます。「CTAボタン」
  ブロック(`cta-button`)は実際にデザインが登録済みの実装例です。
- **メディアライブラリ**: ファイルをアップロードしてalt(代替テキスト)・キャプションを管理でき、
  各ファイルのURLをその場でコピーできます。画像ブロック・画像ギャラリー・カスタムブロックの
  画像フィールドはどれも「メディアから選択」ボタンでアップロード済みの画像を選べ、選択すると
  URL・alt・キャプションが自動的に反映されます。
- **カテゴリー管理**: 記事の作成/編集画面からその場でカテゴリーを新規作成できます。
- **固定ページ(Page)**: 会社概要のような更新頻度の低いページ用のAPI(現時点では管理画面UIはなく、
  API経由での操作を想定)。
- **REST API**: 管理画面自身も内部ではこのAPIだけを呼び出す、数ある消費者の一つに過ぎません。
- **デプロイテンプレート**: GitHub Actionsによる自動デプロイと、サーバーなしでcloudflaredの
  一時トンネルだけを使う対面デモ用スクリプトの両方を用意しています。

## アーキテクチャ

```
apps/
  admin      (Next.js, :3001) — ログイン後にコンテンツを作成/管理
  api        (NestJS, :4000) — REST API + Prisma + PostgreSQL
  website    (Next.js, :3000) — 公開サイト。APIのみ呼び出し、DBへのアクセスなし
packages/
  blocks     — ブロックエディタのコンテンツモデル(Block型、検証、HTML変換、BlockRenderer、
               カスタムブロックのプリセットレンダラー)
  ui         — 共用デザインシステム(globals.css, Logo)
```

```
Admin (Next.js) ──┐
                   ├──▶ REST API (NestJS) ──▶ Prisma ──▶ PostgreSQL
Website (Next.js) ─┘
```

Adminも結局はAPIの数ある消費者の一つに過ぎません — 記事を保存するときも、公開サイトが記事を
表示するときも、常に同じAPIを経由します。DBの構造が変わっても、APIのレスポンス形式さえ維持
されればフロントエンド側は影響を受けません。

## 技術スタック

| 領域 | 技術 |
| --- | --- |
| Admin / Website | Next.js 16 (App Router) + React + TypeScript |
| API | NestJS 11 + Prisma 7(ドライバーアダプター方式) |
| DB | PostgreSQL(ローカル開発はDocker Compose) |
| 認証 | JWT(httpOnlyクッキー) — 別途セッションストアなしでAPIが直接検証 |
| モノレポ | npm workspaces |

> ⚠️ Next.js 16とPrisma 7は比較的最近のメジャーバージョンのため、既存のチュートリアルとAPIが
> 異なる場合があります(Route Handler/動的ルートの`params`が`Promise`である点、Prismaが
> `schema.prisma`ではなく`prisma.config.ts` + ドライバーアダプターでDBに接続する点、
> `middleware.ts`が`proxy.ts`に名前が変わった点など)。このリポジトリは該当バージョンに
> 合わせてすでに調整済みです。

## 必要要件

- **Node.js 20以上**(`.nvmrc`あり — `nvm use`で合わせられます)
- **Docker**(ローカルPostgreSQL実行用)

## はじめに

```bash
# 1. Nodeバージョンを合わせる
nvm use

# 2. PostgreSQLを起動(Docker Compose)
cp .env.example .env
docker compose up -d db

# 3. 依存関係のインストール(モノレポ全体: admin/api/website/packages)
npm install

# 4. 各アプリの環境変数を設定
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env.local
cp apps/website/.env.example apps/website/.env.local

# 5. 共用パッケージのビルド(blocksはtscでビルドしないとadmin/api/websiteが使えません)
npm run build -w @cms/blocks

# 6. DBマイグレーション + シード(管理者アカウント1件、Site 1件、サンプル記事5件、カテゴリー4件を作成)
npm run prisma:migrate -- --name init
npm run db:seed

# 7. 開発サーバーを起動(api・admin・websiteを同時実行)
npm run dev
```

ブラウザで確認:

- `http://localhost:3000` — 公開サイト(公開済み記事一覧)
- `http://localhost:3001` — 管理画面(ログイン必須、シードされたアカウント: `apps/api/.env`の`ADMIN_EMAIL`/`ADMIN_PASSWORD`)
- `http://localhost:4000` — API
- `http://localhost:8080` — Adminer(DB GUI、`docker compose up -d`で一緒に起動)

## 使い方

1. **ログイン** — `http://localhost:3001` を開くとログイン画面が表示されます。認証なしでは
   他のどの管理画面にもアクセスできません。
2. **(任意)メディアを先にアップロード** — 「メディア」画面からファイルをアップロードし、
   alt・キャプションを入力しておくと、後で記事に画像を挿入するときにワンクリックで選べます。
   記事編集画面からその場でアップロードすることもできるので、必須の手順ではありません。
3. **記事を作成** — 「新規投稿」でタイトルを入力し、本文欄下の「+ 段落」「+ 見出し」
   「+ 画像」「+ 画像ギャラリー」などのボタンでブロックを積み重ねます。画像系のブロックは
   「メディアから選択」でアップロード済みの画像を選べ、URL・alt・キャプションが自動で入ります。
   「カスタムブロック」画面で作った独自ブロックがあれば、そのブロック名のボタンとしてここにも
   並びます。
4. **プレビューで確認** — 画面右上の「プレビュー」で、保存前に公開時と同じ見た目を確認できます。
5. **カテゴリーを選んで保存/公開** — 既存のカテゴリーから選ぶか、その場で新規作成できます。
   「保存」(下書きのまま)か「保存してすぐ公開」を選びます。
6. **公開サイトで確認** — `http://localhost:3000` で実際に表示されているか確認します。
7. **(必要なら)カスタムブロックを追加** — 「カスタムブロック」→「+ 新規作成」でブロック名と
   フィールド構成(キー・ラベル・型・必須)を定義します。フィールドの値をどんな見た目で描画
   するかは開発者が`packages/blocks/src/presets`にレンダラーを登録して決めます(`cta-button`が
   実装例)。レンダラーを登録するまでは、値をラベル:値のリストとして安全に表示するフォール
   バック表示になります。

## データモデル

```prisma
model Site {
  id     String @id @default(cuid())
  name   String
  domain String @unique
  // V1ではこのテーブルに行がちょうど1つだけ存在すると仮定します(「1 CMS = 1 Site」)。
  // 将来マルチサイトが必要になったら、このモデルを起点に拡張します。
}

model User {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
}

model Post {
  id          String        @id @default(cuid())
  siteId      String
  title       String
  slug        String        @unique
  excerpt     String?
  content     Json          // ブロックエディタのBlock[](packages/blocks参照)
  status      ContentStatus @default(DRAFT) // DRAFT | PUBLISHED
  author      String        @default("Admin")
  thumbnailId String?       // Media参照(任意)
  categories  Category[]
}

model Category {
  id     String @id @default(cuid())
  siteId String
  name   String
  slug   String @unique
  posts  Post[]
}

model Page {
  id      String        @id @default(cuid())
  siteId  String
  title   String
  slug    String        @unique
  content Json
  status  ContentStatus @default(DRAFT)
}

model Media {
  id       String  @id @default(cuid())
  siteId   String
  filename String
  url      String
  mimeType String
  size     Int
  alt      String? // 代替テキスト。画像系ブロックで選択すると自動的に反映される
  caption  String? // キャプション。同じく画像系ブロックで選択すると自動的に反映される
}

model BlockType {
  id     String @id @default(cuid())
  siteId String
  name   String
  slug   String @unique
  fields Json   // FieldDef[](packages/blocks参照) — カスタムブロックのフィールド構成
}
```

### コンテンツはブロックとして保存されます

`Post.content`/`Page.content`は自由なテキストやHTMLではなく、決められた6種類のブロック
(段落/見出し/リスト/引用/画像/画像ギャラリー、`packages/blocks`)の配列です。画面に表示する際も
`BlockRenderer`がJSXで直接描画するため、`dangerouslySetInnerHTML`は使いません — 本文に
`<script>`のような文字列を入れても、コードとして実行されず文字通りエスケープされて出力されます。
画像系ブロックのurlが`/uploads/...`のような相対パスの場合は、表示する側(admin/website/API)が
それぞれ自分のAPI公開アドレスを使って絶対URLに変換してから描画します。

### カスタムブロック(ACFのフィールドグループに相当)

管理画面の「カスタムブロック」画面(`/block-types`)で、ACFの「フィールドグループ」のように
ブロックごとのフィールド構成(`FieldDef[]`: キー・ラベル・型・必須)だけを定義できます。
定義すると記事編集画面のブロック一覧に「+ ブロック名」として追加され、フィールド型
(テキスト/複数行テキスト/数値/はい・いいえ/URL/画像URL)に応じた入力フォームが自動生成されます。
「必須」を付けたフィールドは、実際に保存前チェックで強制されます(空のまま保存しようとすると
どのブロックのどのフィールドが未入力か名指しでエラーになり、保存がブロックされます)。

自由なHTMLテンプレートを保存して値をそこに差し込む方式(ACFで言えば独自にHTML文字列を組み立てる
ようなやり方)は、保存されたテキストがそのままタグとして解釈されうるXSSの温床になるため採用して
いません。フィールドの値をどんな見た目(HTML/デザイン)で描画するかは、開発者が
`BlockRenderer`(JSX、admin/website共通)と`blocksToHtml`(外部向けHTML文字列)に
ブロックタイプのslugをキーとしたレンダラーを`packages/blocks/src/presets`に登録して決めます。
`cta-button`(ボタン付きのCTAブロック)が実際に登録済みの実装例です。レンダラー未登録のブロック
タイプは、すべての値をエスケープした上でラベル:値のリストとして安全にフォールバック表示されます
(コードとして実行されることはありません)。

### メディアライブラリ

管理画面の「メディア」画面(`/media`)からファイルをアップロードでき、alt(代替テキスト)・
キャプションをアップロード時またはその後に編集できます。各ファイルのURLはカード内にそのまま
表示され、「コピー」ボタンでクリップボードにコピーできます。

画像ブロック・画像ギャラリー・カスタムブロックの画像フィールドはどれも、テキストでURLを直接
入力する代わりに「メディアから選択」ボタンでこのライブラリから選ぶことができ、その場で新しい
ファイルをアップロードしてすぐ選択することもできます。選択すると、その画像に登録済みのalt・
キャプションが自動的にブロックへコピーされます(altが未登録の場合はファイル名から読める形の
文字列を代わりに使い、altが必ず空にならないようにしています)。

## REST API

| Method | パス | 認証 | 説明 |
| --- | --- | --- | --- |
| GET | `/posts` | - | 公開済みの記事のみ取得。`?category=slug`で絞り込み可能 |
| GET | `/posts/slug/:slug` | - | スラッグで記事を取得(公開済みのみ、それ以外は404) |
| GET | `/posts/all` | ✅ | 状態を問わず全記事一覧(管理画面の一覧用) |
| GET | `/posts/:id` | ✅ | 記事1件の取得 |
| POST | `/posts` | ✅ | 記事の作成 |
| PATCH | `/posts/:id` | ✅ | 記事の更新 |
| DELETE | `/posts/:id` | ✅ | 記事の削除 |
| GET | `/categories` | - | カテゴリー一覧 |
| POST/PATCH/DELETE | `/categories(/:id)` | ✅ | カテゴリーの作成/更新/削除 |
| GET/POST/PATCH/DELETE | `/pages(/:id)` | 一部 | Postと同じパターン(カテゴリー・作成者なし) |
| GET/POST/PATCH/DELETE | `/media(/:id)` | ✅ | ファイルのアップロード(`multipart/form-data`。alt/captionも同時送信可)/一覧/alt・captionの更新/削除 |
| GET/POST/PATCH/DELETE | `/block-types(/:id)` | ✅ | カスタムブロックのフィールド構成の作成/更新/削除・一覧取得(管理画面専用) |
| POST | `/auth/login` | - | `{ email, password }` → セッションクッキー(JWT, httpOnly)を発行 |
| POST | `/auth/logout` | - | セッションクッキーを削除 |
| GET | `/auth/me` | ✅ | 現在ログイン中のユーザーを確認 |

レスポンスの`content`はパース済みのブロック配列、`contentHtml`はサーバーが事前に変換した
安全なHTML文字列です。自分で画面を組み立てたい場合は`content`を、すばやくそのまま挿入したい
場合は`contentHtml`を使ってください。登録済みのカスタムブロック(`cta-button`など)は
`contentHtml`でもそのデザイン通りにHTML化され、未登録のブロックタイプはラベル:値のリストに
フォールバックします。

### 例: ログイン後に記事を作成

```bash
curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "change-me"}'

curl -b cookies.txt -X POST http://localhost:4000/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "最初の記事",
    "content": [{ "type": "paragraph", "text": "本文の内容です。" }],
    "status": "PUBLISHED"
  }'
```

- `slug`は`title`をもとに自動生成されます(直接指定も可能。重複した場合は`-2`、`-3`...が自動的に付与されます)。
- `excerpt`を省略すると、本文の先頭部分から自動で要約が作られます。
- `status`を省略した場合のデフォルトは`DRAFT`(下書き)です。
- ログインが必要なエンドポイントは、セッションクッキーがないと`401`を返します。

## 管理画面(`apps/admin`)

- **ログイン**(`/login`): 認証なしでは他のすべての画面にアクセスできません(`proxy.ts`が
  クッキーの有無を確認してリダイレクトします。実際の署名/有効期限の検証は、APIリクエストの
  たびにサーバー側で行われます)。
- **記事管理**(`/posts`): ステータスバッジ、公開切り替え・修正・削除。
- **新規投稿 / 修正**(`/posts/new`, `/posts/[id]/edit`): ブロックエディタで本文を構成し、
  画像系ブロックはメディアライブラリからその場で選択・アップロードでき、保存前のプレビュー、
  公開済み記事は公開サイトへ直接移動できるリンクを提供します。
- **カテゴリー管理**(`/categories`): 作成/削除。
- **メディア**(`/media`): ファイルのアップロード、alt・キャプションの編集、URLのコピー、一覧、削除。
- **カスタムブロック**(`/block-types`): ACFの「フィールドグループ」に相当するカスタムブロックの
  フィールド構成を作成/修正/削除。作成したブロックは記事編集画面のブロック一覧にすぐ追加されます。

## V1の範囲

`structure.md`に明記されている通り、今回のV1では**シンプルさと保守性**を優先します。

- ✅ 含まれるもの: ログイン、Post、Page、Media、Category、カスタムブロック(ACFスタイル)、API、Website
- ❌ 含まれないもの: Plugin、Theme、Multi-Site切り替えUI
- 🔜 次の候補: Custom Post Type、Workflow、Version History、Pageの管理画面UI

その他の既知の制限事項:

- ユーザーは管理者アカウント1名のみを想定しています(ロール/権限の区別なし)。
- メディアはAPIサーバーのローカルディスク(`apps/api/uploads`)に保存されます — サーバーを
  複数台に増やす場合は、S3などの共有ストレージへの置き換えが必要です。
- 一覧画面のページネーションがありません(記事数が増えたら追加が必要です)。
- Webhook/再検証(revalidate)などのキャッシュ無効化戦略がありません(Websiteは毎リクエストごとにAPIを呼び出します)。

## デプロイ

`.github/workflows/deploy.yml`は、pushのたびに3つのアプリをビルドし、リポジトリ変数
`DEPLOY_ENABLED`が`true`であれば`SSH_HOST`/`SSH_USER`/`SSH_KEY`シークレットを使ってサーバーに
SSH接続し、`pm2`(`ecosystem.config.js`参照)で再起動する**テンプレート**です。実サーバーが
なければbuild jobまでが実行され、deploy jobは自動的にスキップされます。実際のサーバーへの
手順は`deploy/DEPLOY.md`にまとめています。

### 対面デモ — サーバーなしでローカル + トンネルだけで見せる

サーバー契約もドメインもなしで、ノートPCで直接アプリを起動し、
[cloudflared](https://github.com/cloudflare/cloudflared)の一時トンネルで公開URLだけ
発行して見せる方法です。参加者が自分のスマホ/PCで直接URLを開いて確認できます
(画面共有だけで十分な場では`npm run dev`のままで問題ありません)。

```bash
brew install cloudflared   # 未インストールならスクリプトが自動でインストールを試みます
bash deploy/local-demo.sh
```

5〜10分ほどでビルドが終わり、公開サイト用・管理画面用の2つの一時URLが表示されます。
ログイン情報は`apps/api/.env`の`ADMIN_EMAIL`/`ADMIN_PASSWORD`です。終了する際は:

```bash
bash deploy/local-demo-stop.sh
```

cloudflaredの無料トンネルはドメインが毎回ランダムに発行されるため、管理画面・APIが
別ドメイン扱いになりセッションクッキーがそのままでは効きません。このスクリプトは
api起動時にだけ`COOKIE_SAME_SITE=none`をインライン環境変数として渡してこれを回避
しており、`.env`ファイル自体は変更しないため通常の開発・デプロイには影響しません。
詳細な手順やトラブルシューティングは`deploy/LOCAL_DEMO.md`を参照してください。

## 新しいサイト(顧客企業)を作る

このリポジトリをGitHubの**「Use this template」**機能で複製し、`company-a`、`company-b`の
ような新しいリポジトリを作れば、顧客企業ごとに完全に独立したCMSインスタンス(自前のDB、自前の
デプロイ)を持つことができます。複数の顧客企業にまたがる共通機能が増えてきたら、
`packages/blocks`、`packages/ui`のような共用コードを別の配布パッケージ(`headless-cms-core`)
として切り出すことを検討してください。

## 便利なコマンド

```bash
npm run dev            # api・admin・websiteを同時実行
npm run build           # 全体ビルド(blocks → api → admin → websiteの順)
npm run lint            # admin・websiteのESLintチェック

npm run prisma:generate # Prisma Clientの再生成
npm run prisma:migrate  # マイグレーションの作成/適用
npm run db:seed         # シードデータの作成(管理者アカウント + サンプルコンテンツ)
npm run db:studio       # Prisma Studio(DB GUI)

docker compose up -d    # PostgreSQL(+Adminer)を起動
docker compose down     # 終了
```
