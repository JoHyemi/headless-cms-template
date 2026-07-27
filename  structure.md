CMS 설계 방향
기본 방향
본 CMS는 WordPress와 동일하게 "1 CMS = 1 Site" 구조를 기본으로 한다.
각 사이트는 독립적인 CMS 인스턴스를 가지며, 프로젝트마다 별도의 관리자, 데이터, 설정을 관리한다.
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
이 구조를 채택하는 이유는 다음과 같다.
설계가 단순하다.
권한 관리가 단순하다.
사이트별 설정 분리가 쉽다.
WordPress와 유사한 운영 방식이다.
유지보수가 쉽다.

기술 스택
Admin
Next.js
React
TypeScript
관리자는 Next.js 기반으로 개발한다.
관리 화면은 API를 직접 호출하여 데이터를 관리하며, 콘텐츠 수정은 관리자 화면에서 수행한다.
Backend
NestJS
Prisma
PostgreSQL
NestJS는 REST API를 제공하며, 비즈니스 로직과 데이터 관리를 담당한다.
Prisma는 ORM으로 사용한다.
Frontend
공개 사이트는 CMS와 별도의 프로젝트로 개발한다.
프론트엔드는 다음과 같은 기술을 자유롭게 사용할 수 있다.
Next.js
React
Vue
Astro
HTML
기타 Framework
Frontend는 CMS API만 호출하여 화면을 구성한다.

Admin과 Frontend 분리
관리 화면(Admin)과 공개 사이트(Frontend)는 서로 다른 프로젝트이다.
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
관리자는 Admin만 사용하며,
사용자는 Frontend만 접근한다.

API 설계 원칙
API는 Frontend와의 계약(Contract)이다.
Frontend는 데이터베이스 구조를 알 필요가 없으며, API 명세만 신뢰하고 개발한다.
예시
GET /posts/1

Response

{
  "id": 1,
  "title": "...",
  "content": "...",
  "thumbnail": "...",
  "publishedAt": "..."
}
DB 구조가 변경되더라도 API 응답 형식은 가능한 한 유지한다.
API 변경은 호환성을 고려하여 신중하게 수행한다.

데이터베이스 설계 원칙
DB 구조는 API와 독립적으로 관리한다.
Frontend는 DB를 직접 접근하지 않는다.
Frontend
    │
API(DTO)
    │
Service
    │
Prisma
    │
PostgreSQL
비즈니스 로직은 Service 계층에서 처리한다.

향후 확장성
현재 버전(V1)은 단일 사이트를 지원한다.
그러나 데이터 모델은 향후 Multi-site를 지원할 수 있도록 설계한다.
예시
Site
 ├── id
 ├── name
 └── domain

Post
 ├── id
 ├── siteId
 ├── title
 └── content
V1에서는 Site를 하나만 생성하도록 제한한다.
향후 Multi-site가 필요해질 경우,
Site 관리 기능
프로젝트별 권한 관리
프로젝트 선택 UI
등을 추가하여 확장할 수 있도록 한다.

개발 원칙
콘텐츠와 화면을 분리한다.
API 중심으로 설계한다.
Frontend는 API만 사용한다.
DB 구조는 Frontend에 노출하지 않는다.
API의 호환성을 최대한 유지한다.
재사용 가능한 컴포넌트 중심으로 개발한다.
WordPress의 콘텐츠 관리 경험(Post, Page, Custom Post Type, Taxonomy 등)을 참고하되, WordPress의 구조를 그대로 모방하지 않는다.
V1에서는 기능보다 단순성과 유지보수성을 우선한다.

CMS 운영 방식 (V1)
목표
1 CMS = 1 Website
WordPress처럼 사이트마다 독립적인 CMS를 가진다.
GitHub Actions를 이용해 자동 배포한다.

프로젝트 생성
공통 템플릿 저장소를 하나 만든다.
headless-cms-template
새 사이트를 만들 때는 GitHub의 Use this template 기능으로 새로운 저장소를 생성한다.
예시
headless-cms-template
        │
        ├── Use this template
        ▼
company-a

프로젝트 구조
company-a

apps/
├── admin      (Next.js)
├── api        (NestJS)
└── website    (Next.js)

packages/
.github/
admin : 관리자(CMS)
api : REST API
website : 공개 사이트

배포
main 브랜치에 Push
↓
GitHub Actions 실행
↓
EC2(또는 서버)에 자동 배포
↓
사이트와 CMS가 함께 실행

운영
관리자는
cms.company-a.com
에서
로그인
글 작성
페이지 작성
이미지 업로드
를 수행한다.
공개 사이트는
company-a.com
에서 API를 호출하여 콘텐츠를 표시한다.

장점
사이트마다 완전히 독립적
DB도 프로젝트별로 분리
장애가 다른 사이트에 영향을 주지 않음
WordPress와 비슷한 운영 방식
GitHub Actions로 자동 배포 가능

향후(V2)
공통 기능이 많아지면
headless-cms-core
를 별도 패키지로 분리하여 여러 프로젝트에서 공유하도록 개선한다.
V1에서는 Template Repository 기반으로 시작하는 것이 가장 단순하고 유지보수하기 쉽다.



목표:
git clone https://github.com/your-org/headless-cms-template.git

cp .env.example .env

docker compose up -d

npm run prisma:migrate

# 접속
http://localhost:3000  (Website)
http://localhost:3001  (Admin)

아키텍처
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

1. 목적

WordPress를 대체할 자체 Headless CMS 개발

2. 기술스택

Next.js
NestJS
Prisma
PostgreSQL

3. MVP 범위

- 로그인
- Post
- Page
- Media
- Category
- API
- Website

4. 제외

- Plugin
- Theme
- Multi Site

5. 향후 예정

- Custom Post Type
- Workflow
- Version History

