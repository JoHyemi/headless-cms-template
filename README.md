# Headless CMS

WordPress처럼 **"1 CMS = 1 Site"** 구조를 따르는 헤드리스(headless) CMS입니다.
설계 방향은 [` structure.md`](./ structure.md)를 참고했으며, 관리 화면(Admin)과 API(Backend)와
공개 사이트(Website)를 완전히 분리된 앱으로 운영합니다.

- **관리자(Admin)**: 로그인 후 글(Post)·카테고리·미디어를 작성/관리합니다.
- **API**: NestJS로 만든 REST API. Admin과 Website는 이 API만 호출하고, DB 구조를 직접 알지 못합니다.
- **공개 사이트(Website)**: 발행(PUBLISHED)된 글만 API를 통해 보여주는 완전히 별도의 프런트엔드입니다.

## 아키텍처

```
apps/
  admin      (Next.js, :3001) — 로그인 후 콘텐츠 작성/관리
  api        (NestJS, :4000) — REST API + Prisma + PostgreSQL
  website    (Next.js, :3000) — 공개 사이트. API만 호출, DB 접근 없음
packages/
  blocks     — 블록 에디터 콘텐츠 모델(Block 타입, 검증, HTML 변환, BlockRenderer)
  ui         — 공용 디자인 시스템(globals.css, Logo)
```

```
Admin (Next.js) ──┐
                   ├──▶ REST API (NestJS) ──▶ Prisma ──▶ PostgreSQL
Website (Next.js) ─┘
```

Admin도 결국 API의 여러 소비자 중 하나일 뿐입니다 — 글을 저장할 때도, 공개 사이트가 글을
보여줄 때도 항상 같은 API를 거칩니다. DB 구조가 바뀌어도 API 응답 형식만 유지되면 프런트엔드
쪽은 영향받지 않습니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Admin / Website | Next.js 16 (App Router) + React + TypeScript |
| API | NestJS 11 + Prisma 7 (드라이버 어댑터 방식) |
| DB | PostgreSQL (로컬 개발은 Docker Compose) |
| 인증 | JWT(httpOnly 쿠키) — 별도 세션 스토어 없이 API가 직접 검증 |
| 모노레포 | npm workspaces |

> ⚠️ Next.js 16과 Prisma 7은 비교적 최근 메이저 버전이라 기존 튜토리얼과 API가 다를 수 있습니다
> (Route Handler/동적 라우트의 `params`가 `Promise`인 점, Prisma가 `schema.prisma`가 아닌
> `prisma.config.ts` + 드라이버 어댑터로 DB에 연결하는 점, `middleware.ts`가 `proxy.ts`로
> 이름이 바뀐 점 등). 이 저장소는 해당 버전 기준으로 이미 맞춰져 있습니다.

## 요구 사항

- **Node.js 20 이상** (`.nvmrc` 있음 — `nvm use`로 맞출 수 있습니다)
- **Docker** (로컬 PostgreSQL 실행용)

## 시작하기

```bash
# 1. Node 버전 맞추기
nvm use

# 2. PostgreSQL 실행 (Docker Compose)
cp .env.example .env
docker compose up -d db

# 3. 의존성 설치 (모노레포 전체: admin/api/website/packages)
npm install

# 4. 각 앱 환경 변수 설정
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env.local
cp apps/website/.env.example apps/website/.env.local

# 5. 공용 패키지 빌드 (blocks는 tsc로 빌드해야 admin/api/website가 가져다 씁니다)
npm run build -w @cms/blocks

# 6. DB 마이그레이션 + 시드 (관리자 계정 1개, Site 1개, 예시 글 5개, 카테고리 4개 생성)
npm run prisma:migrate -- --name init
npm run db:seed

# 7. 개발 서버 실행 (api·admin·website 동시 실행)
npm run dev
```

브라우저에서 확인:

- `http://localhost:3000` — 공개 사이트 (발행된 글 목록)
- `http://localhost:3001` — 관리자 화면 (로그인 필요, 시드된 계정: `apps/api/.env`의 `ADMIN_EMAIL`/`ADMIN_PASSWORD`)
- `http://localhost:4000` — API
- `http://localhost:8080` — Adminer (DB GUI, `docker compose up -d`로 함께 실행됨)

## 데이터 모델

```prisma
model Site {
  id     String @id @default(cuid())
  name   String
  domain String @unique
  // V1은 이 테이블에 행이 정확히 하나만 존재한다고 가정합니다 ("1 CMS = 1 Site").
  // 향후 멀티사이트가 필요해지면 이 모델을 기준으로 확장합니다.
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
  content     Json          // 블록 에디터의 Block[] (packages/blocks 참고)
  status      ContentStatus @default(DRAFT) // DRAFT | PUBLISHED
  author      String        @default("Admin")
  thumbnailId String?       // Media 참조 (선택)
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
  id       String @id @default(cuid())
  siteId   String
  filename String
  url      String
  mimeType String
  size     Int
}
```

### 콘텐츠는 블록으로 저장됩니다

`Post.content`/`Page.content`는 자유 텍스트나 HTML이 아니라, 정해진 5가지 블록
(문단/제목/목록/인용구/이미지, `packages/blocks`)의 배열입니다. 화면에 표시할 때도
`BlockRenderer`가 JSX로 직접 그리므로 `dangerouslySetInnerHTML`을 쓰지 않습니다 — 본문에
`<script>` 같은 문자열을 넣어도 코드로 실행되지 않고 글자 그대로 이스케이프되어 출력됩니다.

## REST API

| Method | 경로 | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/posts` | - | 발행된 글만 조회. `?category=slug`로 필터링 |
| GET | `/posts/slug/:slug` | - | 슬러그로 글 조회 (발행글만, 아니면 404) |
| GET | `/posts/all` | ✅ | 상태 무관 전체 글 목록 (관리자 목록용) |
| GET | `/posts/:id` | ✅ | 글 단건 조회 |
| POST | `/posts` | ✅ | 글 작성 |
| PATCH | `/posts/:id` | ✅ | 글 수정 |
| DELETE | `/posts/:id` | ✅ | 글 삭제 |
| GET | `/categories` | - | 카테고리 목록 |
| POST/PATCH/DELETE | `/categories(/:id)` | ✅ | 카테고리 생성/수정/삭제 |
| GET/POST/PATCH/DELETE | `/pages(/:id)` | 일부 | Post와 동일한 패턴 (카테고리·작성자 없음) |
| GET/POST/DELETE | `/media(/:id)` | ✅ | 파일 업로드(`multipart/form-data`)/목록/삭제 |
| POST | `/auth/login` | - | `{ email, password }` → 세션 쿠키(JWT, httpOnly) 발급 |
| POST | `/auth/logout` | - | 세션 쿠키 제거 |
| GET | `/auth/me` | ✅ | 현재 로그인 사용자 확인 |

응답의 `content`는 파싱된 블록 배열, `contentHtml`은 서버가 미리 변환해준 안전한 HTML
문자열입니다. 직접 화면을 그리고 싶다면 `content`를, 빠르게 그대로 삽입하고 싶다면
`contentHtml`을 쓰면 됩니다.

### 예시: 로그인 후 글 작성

```bash
curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "change-me"}'

curl -b cookies.txt -X POST http://localhost:4000/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "첫 번째 글",
    "content": [{ "type": "paragraph", "text": "본문 내용입니다." }],
    "status": "PUBLISHED"
  }'
```

- `slug`는 `title`을 기반으로 자동 생성됩니다 (직접 지정도 가능, 중복되면 `-2`, `-3` ... 자동 부여).
- `excerpt`를 생략하면 본문 첫 부분에서 자동으로 요약을 만듭니다.
- `status`를 생략하면 기본값은 `DRAFT`(임시저장)입니다.
- 로그인이 필요한 엔드포인트는 세션 쿠키가 없으면 `401`을 반환합니다.

## 관리자 화면 (`apps/admin`)

- **로그인** (`/login`): 인증 없이는 나머지 모든 화면에 접근할 수 없습니다(`proxy.ts`가 쿠키
  존재 여부를 확인해 리다이렉트합니다. 실제 서명/만료 검증은 매 API 요청마다 서버가 수행).
- **글 관리** (`/posts`): 상태 배지, 발행 전환·수정·삭제.
- **새 글 작성 / 수정** (`/posts/new`, `/posts/[id]/edit`): 블록 에디터로 본문을 구성하고,
  저장 전 미리보기, 발행된 글은 공개 사이트로 바로 이동하는 링크를 제공합니다.
- **카테고리 관리** (`/categories`): 생성/삭제.
- **미디어** (`/media`): 파일 업로드, 목록, 삭제.

## V1 범위

`structure.md`에 명시된 대로, 이번 V1은 **단순성과 유지보수성**을 우선합니다.

- ✅ 포함: 로그인, Post, Page, Media, Category, API, Website
- ❌ 제외: Plugin, Theme, Multi-Site 전환 UI
- 🔜 다음 단계 후보: Custom Post Type, Workflow, Version History

그 외 알려진 제한사항:

- 사용자는 관리자 계정 1명만 가정합니다 (역할/권한 구분 없음).
- 미디어는 API 서버의 로컬 디스크(`apps/api/uploads`)에 저장됩니다 — 서버를 여러 대로
  늘리려면 S3 등 공유 스토리지로 교체해야 합니다.
- 목록 페이지네이션이 없습니다 (글이 많아지면 추가 필요).
- Webhook/재검증(revalidate) 등 캐시 무효화 전략이 없습니다 (Website가 매 요청마다 API를 호출).

## 배포

`.github/workflows/deploy.yml`은 push 시 3개 앱을 빌드하고, 저장소 변수 `DEPLOY_ENABLED`가
`true`이면 `SSH_HOST`/`SSH_USER`/`SSH_KEY` 시크릿으로 서버에 SSH 접속해 `pm2`
(`ecosystem.config.js` 참고)로 재시작하는 **템플릿**입니다. 실제 서버가 없으면 build job까지만
실행되고 deploy job은 자동으로 건너뜁니다.

## 새 사이트(고객사) 만들기

이 저장소를 GitHub의 **"Use this template"** 기능으로 복제해 `company-a`, `company-b` 같은
새 저장소를 만들면, 고객사마다 완전히 독립된 CMS 인스턴스(자체 DB, 자체 배포)를 가질 수
있습니다. 여러 고객사에 걸쳐 공통 기능이 많아지면 그때 `packages/blocks`, `packages/ui` 같은
공용 코드를 별도 배포 패키지(`headless-cms-core`)로 분리하는 것을 고려하세요.

## 유용한 명령어

```bash
npm run dev            # api·admin·website 동시 실행
npm run build           # 전체 빌드 (blocks → api → admin → website 순서)
npm run lint            # admin·website ESLint 검사

npm run prisma:generate # Prisma Client 재생성
npm run prisma:migrate  # 마이그레이션 생성/적용
npm run db:seed         # 시드 데이터 생성 (관리자 계정 + 예시 콘텐츠)
npm run db:studio       # Prisma Studio (DB GUI)

docker compose up -d    # PostgreSQL(+Adminer) 실행
docker compose down     # 종료
```
