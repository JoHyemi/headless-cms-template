# 시연 서버 배포 — 오늘 안에 끝내는 순서

대상: XServer VPS 2GB (Ubuntu) + Cloudflare 도메인
소요: 순조로우면 60~90분. 도메인 DNS 반영 대기가 가장 큰 변수입니다.

> **순서가 중요합니다.** 도메인을 먼저 사서 DNS를 걸어두고 서버를 세팅해야,
> 서버가 준비됐을 때 인증서가 바로 발급됩니다. 반대로 하면 마지막에 DNS를
> 기다리며 멍하니 앉아 있게 됩니다.

---

## 1. 도메인 먼저 (10분, 그리고 백그라운드로 전파 대기)

Cloudflare Registrar에서 구매합니다. 원가 판매라 `.com` 기준 연 $11 내외이고,
구매 즉시 Cloudflare DNS에 등록돼서 레코드를 바로 만질 수 있습니다.

서버 IP를 아직 모르니, **VPS를 먼저 만들어 IP를 받은 뒤** 아래 레코드를 넣으세요.
(2번을 먼저 하고 돌아와도 됩니다.)

| Type | Name    | Content       | Proxy status |
| ---- | ------- | ------------- | ------------ |
| A    | `@`     | 서버 IP       | **DNS only** |
| A    | `www`   | 서버 IP       | **DNS only** |
| A    | `admin` | 서버 IP       | **DNS only** |
| A    | `api`   | 서버 IP       | **DNS only** |

> **Proxy를 반드시 꺼두세요(회색 구름).** 주황색 구름(프록시 ON) 상태면
> Caddy의 Let's Encrypt 인증서 발급이 실패합니다. 시연이 끝난 뒤 켜세요.

반영 확인:

```bash
dig +short api.example.com
```

서버 IP가 나오면 다음 단계로. 보통 1~5분입니다.

### 도메인 없이 갈 경우

IP만으로 시연하면 브라우저에 "안전하지 않음" 경고가 뜹니다. 비개발자 대상
시연에서는 이 경고 하나가 신뢰를 크게 깎아먹으니 $11 쓰는 쪽을 권합니다.
정 안 되면 `nip.io` / `sslip.io` 같은 와일드카드 DNS 서비스로 IP 기반
호스트명(`203-0-113-10.sslip.io`)을 만들어 인증서를 받는 우회법이 있습니다.
다만 이 서비스들은 상시 가용성이 보장되지 않으니, 쓰기 전에 위 `dig`로
해석되는지 먼저 확인하세요.

---

## 2. XServer VPS 계약 (15분)

- 플랜: **2GB** (3vCPU / 2GB / NVMe 50GB), 1개월 계약 1,496엔
- 이미지: **Ubuntu 24.04** (애플리케이션 이미지 말고 순수 OS)
- SSH 키를 등록해두면 비밀번호 로그인 없이 바로 접속됩니다
- 생성되면 **IP 확인 → 1번의 DNS 레코드 입력**

접속:

```bash
ssh root@<서버IP>
```

---

## 3. 서버 부트스트랩 (10분)

```bash
# 코드부터 내려받습니다
apt-get update -y && apt-get install -y git
git clone <저장소 URL> /srv/cms
cd /srv/cms

bash deploy/server-setup.sh
```

swap 4GB, Node 20, PostgreSQL, Caddy, pm2, 방화벽을 한 번에 설치합니다.

**마지막에 출력되는 `DATABASE_URL`을 반드시 복사해두세요.** 비밀번호가 랜덤
생성되며 다시 보여주지 않습니다.

---

## 4. 환경변수 (10분)

`deploy/env.production.example`를 열어 세 부분으로 나눠 저장합니다.

```bash
cd /srv/cms
nano apps/api/.env               # DATABASE_URL, JWT_SECRET, CORS_ORIGINS
nano apps/admin/.env.production  # NEXT_PUBLIC_API_URL
nano apps/website/.env.production
```

특히 주의할 두 가지:

- **`JWT_SECRET`은 새로 만드세요.** `openssl rand -hex 32`
- **`CORS_ORIGINS`에 오타가 있으면** 관리자 로그인이 조용히 실패합니다.
  프로토콜(`https://`)까지 정확히, 끝에 슬래시 없이.

---

## 5. Caddy 설정 (5분)

```bash
sed -i 's/example\.com/실제도메인.com/g' /srv/cms/deploy/Caddyfile
cp /srv/cms/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
journalctl -u caddy -n 30 --no-pager   # 인증서 발급 로그 확인
```

`certificate obtained successfully` 가 보이면 성공입니다.

---

## 6. 빌드 & 기동 (15~25분)

```bash
cd /srv/cms
bash deploy/deploy.sh
```

Next.js 앱 2개를 순차 빌드하므로 시간이 걸립니다. 2GB RAM이라 swap을 쓰면서
느려질 수 있는데 정상입니다.

`pm2 status`에서 세 프로세스가 모두 `online`이면 완료입니다.

---

## 7. 시연 전 점검 (10분)

브라우저에서 직접 확인하세요. 터미널에서 `curl`로 되는 것과 브라우저에서
되는 것은 다릅니다 — CORS와 쿠키는 브라우저에서만 드러납니다.

- [ ] `https://example.com` — 자물쇠 아이콘, 경고 없음
- [ ] `https://admin.example.com` — 로그인 화면 표시
- [ ] 관리자 로그인 성공 (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- [ ] **이미지 업로드 → 저장 → 공개 사이트에 실제로 표시되는지**
- [ ] 콘텐츠 생성 → 공개 사이트 반영
- [ ] 휴대폰에서도 한 번 열어보기 (시연 중 누가 물어봅니다)
- [ ] 서버 재부팅 후에도 살아나는지: `reboot` 후 `pm2 status`

---

## 시연 중 문제가 생기면

```bash
pm2 logs --lines 50          # 앱 에러
journalctl -u caddy -n 50    # 인증서 / 프록시 에러
pm2 restart all              # 일단 살리고 보기
free -h                      # 메모리 부족 여부
```

**502 Bad Gateway** — 앱이 죽은 겁니다. `pm2 status` → `pm2 restart all`.

**로그인은 되는데 화면이 비어 있음** — `CORS_ORIGINS` 또는
`NEXT_PUBLIC_API_URL` 오타입니다. 브라우저 개발자도구 콘솔을 보세요.
`NEXT_PUBLIC_*`을 고쳤다면 `deploy.sh`를 다시 돌려 **재빌드**해야 합니다.
빌드 시점에 값이 번들에 박히기 때문에 재시작만으로는 반영되지 않습니다.

---

## 시연 이후 (오늘 할 일 아님)

- 업로드 파일이 서버 디스크(`apps/api/uploads`)에 저장됩니다. 서버를 잃으면
  같이 사라지니, 실서비스 전에 S3/R2로 옮기세요.
- DB 백업이 없습니다. `pg_dump` 크론을 걸어두세요.
- GitHub Actions 자동 배포는 저장소 변수 `DEPLOY_ENABLED=true` +
  시크릿 `SSH_HOST` / `SSH_USER` / `SSH_KEY`를 등록하면 켜집니다.
  다만 `.github/workflows/deploy.yml`은 서버에서 `migrate dev`를 호출하므로,
  `deploy/deploy.sh`를 호출하도록 바꾸는 편이 안전합니다.
