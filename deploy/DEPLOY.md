# デモサーバーのデプロイ — 今日中に終わらせる手順

対象: XServer VPS 2GB (Ubuntu) + Cloudflareドメイン
所要時間: 順調なら60〜90分。ドメインのDNS反映待ちが一番の変動要因です。

> **順序が重要です。** ドメインを先に買ってDNSを設定してからサーバーをセットアップすると、
> サーバーが準備できた時点で証明書がすぐ発行されます。逆の順序だと、最後にDNSの
> 反映をぼんやり待つことになります。

---

## 1. まずドメイン(10分、その後バックグラウンドで反映待ち)

Cloudflare Registrarで購入します。原価販売なので`.com`なら年$11前後で、
購入するとすぐにCloudflare DNSに登録され、レコードをすぐ操作できます。

サーバーIPがまだわからないので、**先にVPSを作ってIPを受け取ってから**下のレコードを入れてください。
(2番を先にやってから戻ってきても構いません。)

| Type | Name    | Content       | Proxy status |
| ---- | ------- | ------------- | ------------ |
| A    | `@`     | サーバーIP     | **DNS only** |
| A    | `www`   | サーバーIP     | **DNS only** |
| A    | `admin` | サーバーIP     | **DNS only** |
| A    | `api`   | サーバーIP     | **DNS only** |

> **Proxyは必ずオフにしておいてください(グレーの雲)。** オレンジの雲(プロキシON)の状態だと
> CaddyのLet's Encrypt証明書発行が失敗します。デモが終わったらオンにしてください。

反映確認:

```bash
dig +short api.example.com
```

サーバーIPが出れば次のステップへ。通常1〜5分です。

### ドメインなしで行く場合

IPだけでデモすると、ブラウザに「安全でない」警告が出ます。非エンジニア向けの
デモでは、この警告一つで信頼を大きく損なうので、$11を使う方をお勧めします。
どうしても難しければ、`nip.io` / `sslip.io`のようなワイルドカードDNSサービスで
IPベースのホスト名(`203-0-113-10.sslip.io`)を作って証明書を取得する回避策があります。
ただしこれらのサービスは常時の可用性が保証されていないので、使う前に上の`dig`で
解決できるか先に確認してください。

---

## 2. XServer VPS契約(15分)

- プラン: **2GB** (3vCPU / 2GB / NVMe 50GB)、1ヶ月契約1,496円
- イメージ: **Ubuntu 24.04**(アプリケーションイメージではなく素のOS)
- SSHキーを登録しておけば、パスワードログインなしですぐ接続できます
- 作成できたら **IP確認 → 1番のDNSレコードを入力**

接続:

```bash
ssh root@<サーバーIP>
```

---

## 3. サーバーブートストラップ(10分)

```bash
# まずコードを取得します
apt-get update -y && apt-get install -y git
git clone <リポジトリURL> /srv/cms
cd /srv/cms

bash deploy/server-setup.sh
```

swap 4GB、Node 20、PostgreSQL、Caddy、pm2、ファイアウォールを一度にインストールします。

**最後に出力される`DATABASE_URL`を必ずコピーしておいてください。** パスワードはランダム
生成され、再表示されません。

---

## 4. 環境変数(10分)

`deploy/env.production.example`を開いて3つに分けて保存します。

```bash
cd /srv/cms
nano apps/api/.env               # DATABASE_URL, JWT_SECRET, CORS_ORIGINS
nano apps/admin/.env.production  # NEXT_PUBLIC_API_URL
nano apps/website/.env.production
```

特に注意すべき2点:

- **`JWT_SECRET`は新しく作ってください。** `openssl rand -hex 32`
- **`CORS_ORIGINS`にタイプミスがあると**、管理者ログインが静かに失敗します。
  プロトコル(`https://`)まで正確に、末尾にスラッシュなしで。

---

## 5. Caddy設定(5分)

```bash
sed -i 's/example\.com/実際のドメイン.com/g' /srv/cms/deploy/Caddyfile
cp /srv/cms/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
journalctl -u caddy -n 30 --no-pager   # 証明書発行ログを確認
```

`certificate obtained successfully` が見えれば成功です。

---

## 6. ビルド & 起動(15〜25分)

```bash
cd /srv/cms
bash deploy/deploy.sh
```

Next.jsアプリを2つ順番にビルドするので時間がかかります。2GB RAMなのでswapを使いながら
遅くなることがありますが、正常です。

`pm2 status`で3つのプロセスすべてが`online`になれば完了です。

---

## 7. デモ前のチェック(10分)

ブラウザで直接確認してください。ターミナルで`curl`が通ることとブラウザで
通ることは別です — CORSとクッキーはブラウザでしか露呈しません。

- [ ] `https://example.com` — 鍵アイコン、警告なし
- [ ] `https://admin.example.com` — ログイン画面が表示される
- [ ] 管理者ログイン成功(`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- [ ] **画像アップロード → 保存 → 公開サイトに実際に表示されるか**
- [ ] コンテンツ作成 → 公開サイトに反映
- [ ] スマホでも一度開いてみる(デモ中に誰かに聞かれます)
- [ ] サーバー再起動後も生き返るか: `reboot` の後 `pm2 status`

---

## デモ中に問題が起きたら

```bash
pm2 logs --lines 50          # アプリのエラー
journalctl -u caddy -n 50    # 証明書/プロキシのエラー
pm2 restart all              # とりあえず生き返らせる
free -h                      # メモリ不足かどうか
```

**502 Bad Gateway** — アプリが落ちています。`pm2 status` → `pm2 restart all`。

**ログインはできるが画面が空** — `CORS_ORIGINS`または
`NEXT_PUBLIC_API_URL`のタイプミスです。ブラウザの開発者ツールのコンソールを見てください。
`NEXT_PUBLIC_*`を直したら`deploy.sh`を再度実行して**再ビルド**する必要があります。
ビルド時点で値がバンドルに埋め込まれるため、再起動だけでは反映されません。

---

## デモ後(今日やることではありません)

- アップロードファイルはサーバーディスク(`apps/api/uploads`)に保存されます。サーバーを
  失うと一緒に消えるので、本番運用の前にS3/R2に移してください。
- DBバックアップがありません。`pg_dump`のcronを設定しておいてください。
- GitHub Actionsの自動デプロイは、リポジトリ変数`DEPLOY_ENABLED=true` +
  シークレット`SSH_HOST` / `SSH_USER` / `SSH_KEY`を登録すると有効になります。
  ただし`.github/workflows/deploy.yml`はサーバーで`migrate dev`を呼び出すので、
  `deploy/deploy.sh`を呼び出すように変える方が安全です。
