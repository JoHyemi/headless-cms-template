# 대면 시연 — 로컬 + 터널 (서버/도메인 계약 없이)

노트북에서 앱을 직접 띄우고 cloudflared로 공개 URL만 임시로 뚫습니다.
서버 계약, 도메인 구매, SSH 없이 오늘 안에 끝납니다.

전제: 시연이 **대면**이고, 참가자가 자기 폰/노트북으로 URL을 직접 눌러보게
하고 싶은 경우. 화면만 공유하면 되는 자리라면 이것도 필요 없고
`npm run dev`로 충분합니다.

---

## 사전 준비 (한 번만)

```bash
brew install cloudflared   # 없으면 스크립트가 자동으로 설치를 시도합니다
```

Docker Desktop이 켜져 있어야 합니다 (로컬 Postgres용).

`apps/api/.env`가 이미 채워져 있어야 합니다 — 평소 `npm run dev`로 로컬
개발하실 때 쓰던 그 파일 그대로면 됩니다. 없다면:

```bash
cp apps/api/.env.example apps/api/.env
```

---

## 실행

```bash
cd cms
bash deploy/local-demo.sh
```

5~10분 정도 걸립니다(빌드 2번 포함). 끝나면 이렇게 출력됩니다:

```
공개 사이트: https://random-word-word.trycloudflare.com
관리자 화면: https://another-word.trycloudflare.com
```

이 두 URL을 참가자에게 그대로 공유하면 됩니다. QR코드로 만들어두면 더
편합니다.

**로그인 정보**는 `apps/api/.env`의 `ADMIN_EMAIL` / `ADMIN_PASSWORD`입니다.

---

## 시연 중 확인해두면 좋은 것

- [ ] 관리자 화면 URL에서 로그인이 실제로 됩니다 (아래 "로그인이 안 될 때" 참고)
- [ ] 콘텐츠 작성 → 공개 사이트에 반영되는 흐름 한 번 해보기
- [ ] 이미지 업로드 → 공개 사이트에 표시되는지
- [ ] 본인 휴대폰(와이파이든 데이터든 상관없음)으로 URL 직접 열어보기

---

## 끝나면

```bash
bash deploy/local-demo-stop.sh
```

api/admin/website 프로세스와 터널 3개를 정리합니다. 로컬 Postgres 컨테이너는
다음에 또 쓸 수 있게 그대로 둡니다. 완전히 끄려면 `docker compose down`.

---

## 왜 admin/website/api를 따로 터널링하나요

cloudflared 무료 터널(quick tunnel)은 URL을 매번 랜덤으로 발급하고, 커스텀
서브도메인을 지정할 수 없습니다. 그래서 세 개의 서로 다른 도메인이 생기는데,
관리자 로그인은 세션 쿠키를 쓰기 때문에 이 상태로는 원래 로그인이 깨집니다
(admin 도메인에서 보낸 요청에 api 도메인 쿠키가 안 실림). `local-demo.sh`가
api 프로세스를 띄울 때 `COOKIE_SAME_SITE=none`을 인라인 환경변수로만
넘겨서 이 경우에만 우회하도록 해뒀습니다 — `.env` 파일은 건드리지 않으므로
평소 배포(`deploy/deploy.sh`)나 개발 환경에는 전혀 영향이 없습니다.

---

## 문제 해결

**"cloudflared가 없습니다"** — `brew install cloudflared` 후 재실행.

**빌드 중간에 멈춤 / 느림** — Next.js 빌드 2개를 순차로 돌립니다. 노트북
사양에 따라 각 1~3분 걸릴 수 있습니다. `deploy/.logs/` 안의 로그로 진행
상황을 볼 수 있습니다.

**터널 URL을 30초 안에 못 받음** — 사내망/방화벽이 아웃바운드 연결을
막고 있을 수 있습니다. 카페·개인 핫스팟 등 다른 네트워크에서 재시도하세요.

**관리자 로그인 후 바로 로그아웃된 것처럼 보임** — 브라우저 콘솔에서
`/auth/login` 응답에 `Set-Cookie`가 있는지, 다음 요청이 `401`인지 확인하세요.
스크립트가 `COOKIE_SAME_SITE=none`을 넘기지 못했다면(수동으로 api를
띄운 경우 등) 이 증상이 납니다.

**"502" 또는 연결 안 됨** — api/admin/website 중 하나가 죽은 겁니다.
`deploy/.logs/api.log`, `admin.log`, `website.log` 확인 후
`bash deploy/local-demo-stop.sh` → `bash deploy/local-demo.sh` 재실행.

**시연 도중 노트북이 잠자기 모드로** — 시스템 설정에서 "전원 어댑터 연결 시
디스플레이 끄기 안 함"으로 잠깐 바꿔두세요. 잠들면 터널이 끊깁니다.
