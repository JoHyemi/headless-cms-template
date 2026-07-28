# 対面デモ — ローカル + トンネル(サーバー/ドメイン契約なし)

ノートPCで直接アプリを起動し、cloudflaredで公開URLだけを一時的に開きます。
サーバー契約、ドメイン購入、SSHなしで今日中に終わります。

前提: デモが**対面**で、参加者に自分のスマホ/ノートPCでURLを直接開いて
もらいたい場合。画面共有だけで済む場ならこれも不要で、
`npm run dev`で十分です。

---

## 事前準備(一度だけ)

```bash
brew install cloudflared   # なければスクリプトが自動でインストールを試みます
```

Docker Desktopが起動している必要があります(ローカルPostgres用)。

`apps/api/.env`がすでに埋まっている必要があります — 普段`npm run dev`で
ローカル開発する時に使っているそのファイルのままでOKです。なければ:

```bash
cp apps/api/.env.example apps/api/.env
```

---

## 実行

```bash
cd cms
bash deploy/local-demo.sh
```

5〜10分ほどかかります(ビルド2回含む)。終わるとこう出力されます:

```
公開サイト: https://random-word-word.trycloudflare.com
管理画面: https://another-word.trycloudflare.com
```

この2つのURLをそのまま参加者に共有すればOKです。QRコードにしておくと
より便利です。

**ログイン情報**は`apps/api/.env`の`ADMIN_EMAIL` / `ADMIN_PASSWORD`です。

---

## デモ中に確認しておくとよいこと

- [ ] 管理画面のURLで実際にログインできる(下の「ログインできない時」参照)
- [ ] コンテンツ作成 → 公開サイトに反映される流れを一度試す
- [ ] 画像アップロード → 公開サイトに表示されるか
- [ ] 自分のスマホ(Wi-Fiでもモバイル回線でもOK)でURLを直接開いてみる

---

## 終わったら

```bash
bash deploy/local-demo-stop.sh
```

api/admin/websiteのプロセスとトンネル3つを片付けます。ローカルPostgres
コンテナは次回も使えるようそのままにします。完全に止めるには`docker compose down`。

---

## なぜadmin/website/apiを別々にトンネリングするのか

cloudflaredの無料トンネル(quick tunnel)はURLを毎回ランダムに発行し、カスタム
サブドメインを指定できません。そのため3つの異なるドメインができるのですが、
管理者ログインはセッションクッキーを使うため、このままではログインが壊れます
(adminドメインから送ったリクエストにapiドメインのクッキーが乗らない)。`local-demo.sh`が
apiプロセスを起動する際に`COOKIE_SAME_SITE=none`をインライン環境変数としてだけ
渡し、この場合だけ回避するようにしてあります — `.env`ファイルには手を加えないため、
普段のデプロイ(`deploy/deploy.sh`)や開発環境には一切影響しません。

---

## トラブルシューティング

**「cloudflaredがありません」** — `brew install cloudflared` 後に再実行。

**ビルド途中で止まる/遅い** — Next.jsのビルドを2つ順番に実行します。ノートPCの
スペックによって各1〜3分かかることがあります。`deploy/.logs/` 内のログで進行
状況を確認できます。

**トンネルURLを30秒以内に取得できない** — 社内ネットワーク/ファイアウォールが
アウトバウンド接続をブロックしている可能性があります。カフェ・個人のホットスポットなど
別のネットワークで再試行してください。

**管理者ログイン後すぐログアウトしたように見える** — ブラウザのコンソールで
`/auth/login`のレスポンスに`Set-Cookie`があるか、次のリクエストが`401`かどうか確認してください。
スクリプトが`COOKIE_SAME_SITE=none`を渡せなかった場合(手動でapiを
起動した場合など)にこの症状が出ます。

**「502」または接続できない** — api/admin/websiteのいずれかが落ちています。
`deploy/.logs/api.log`、`admin.log`、`website.log`を確認してから
`bash deploy/local-demo-stop.sh` → `bash deploy/local-demo.sh` を再実行。

**デモ中にノートPCがスリープモードに** — システム設定で「電源アダプタ接続時は
ディスプレイをオフにしない」に一時的に変えておいてください。スリープするとトンネルが切れます。
