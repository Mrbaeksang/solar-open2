# 밝은 AI 교과서

로그인 없이 읽고, 현재 읽는 절을 바탕으로 질문하는 한국어 AI 리터러시 교과서다.

- 쉬운 트랙: 초등학교 5학년–중학교 3학년
- 기본 트랙: 고등학교 1학년 이상 비전공자
- 7개 챕터를 트랙별로 독립 집필
- 주장 단위 출처, 출처 인덱스, 세 상태의 근거 표시
- Next.js/Vercel 프론트 + Go/Eino/Railway API
- Solar Open 2 채팅 + Solar Embedding 2 + PostgreSQL/pgvector 하이브리드 검색

## 로컬 실행

API는 `apps/api/.env`, Web은 Next.js 규칙에 따라 `apps/web/.env.local`을 읽는다. 각각 같은 디렉터리의 `.env.example`을 기준으로 만들며 실제 파일은 Git에서 제외한다.

```bash
pnpm install
pnpm content:build
```

터미널 1:

```bash
pnpm dev:api
```

터미널 2:

```bash
pnpm dev:web
```

검증:

```bash
pnpm typecheck
pnpm test
pnpm eval
pnpm build
pnpm test:e2e
docker build --tag solar-open2-api:local apps/api
```

`UPSTAGE_API_KEY`는 브라우저 변수나 Git에 넣지 않는다. `PROVIDER_MODE=deterministic`은 자동화 테스트에서만 사용하며 로컬 실서비스와 Railway에는 설정하지 않는다.

## 배포 연결

두 플랫폼 모두 GitHub의 `Mrbaeksang/solar-open2` 저장소와 `main` 브랜치를 사용한다.

Vercel 프로젝트 설정:

- Framework Preset: `Next.js`
- Root Directory: `apps/web`
- Include source files outside of the Root Directory: 켬
- Node.js: `24.x`
- Build Command: `pnpm build`
- Install Command, Output Directory: 기본값
- 환경 변수: `NEXT_PUBLIC_API_URL=https://<railway-api-domain>`, `NEXT_PUBLIC_SITE_URL=https://<vercel-production-domain>`

Railway API 서비스 설정:

- Root Directory: `/apps/api`
- Config File Path: `/apps/api/railway.toml`
- Builder와 시작 명령: 저장소 설정 사용
- Public Networking에서 도메인 생성
- Railway가 주입하는 `PORT`는 직접 만들지 않음

일반 PostgreSQL이 아니라 PostgreSQL + pgvector 템플릿을 추가한다. API 서비스 변수:

```dotenv
UPSTAGE_API_KEY=<secret>
DATABASE_URL=${{pgvector.DATABASE_URL}}
AUTO_INDEX=true
WEB_ORIGIN=https://<vercel-production-domain>
```

DB 서비스 이름이 `pgvector`가 아니면 `DATABASE_URL`의 참조 이름도 맞춘다. `WEB_ORIGIN`은 쉼표로 여러 실제 Vercel origin을 받을 수 있다. Railway가 주입하는 `PORT`와 나머지 Suggested Variables는 추가하지 않는다.

## 콘텐츠 검증

원본은 `apps/web/content/`의 MDX와 구조화된 주장·출처 메타데이터다. `pnpm content:build`가 프론트 읽기 데이터와 Go 검색 코퍼스를 함께 만든다.

로컬과 Vercel production 모두 같은 콘텐츠 검증을 실행한다. 출처·주장·챕터 구조가 유효하면 빌드되며, 외부 AI/컴퓨터과학 검수 진행 상태는 GitHub 이슈 #12와 챕터 메타데이터에 기록한다.

아키텍처 결정은 `docs/adr/`, 도메인 언어는 `CONTEXT.md`, 출처 선정 근거는 `docs/research/verified-ai-literacy-sources.md`에 있다.
