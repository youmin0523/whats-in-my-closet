# CLAUDE.md — 프로젝트 작업 규약

옷장 지킴이(What's in my closet). 반응형 웹 우선 → 모바일(Expo) 후속. 한국 우선.
설계: `~/.claude/plans/clever-splashing-beacon.md` · 디자인: `DESIGN.md` · 진행: `HANDOFF.md`.

## 스택

Next.js **16**(App Router, Turbopack 기본) · React 19 · TypeScript · Tailwind **v4** · shadcn/ui
· tRPC v11 · Drizzle + PostgreSQL 16 + **pgvector** · Auth.js v5(카카오/네이버/구글) · Cloudinary
· Turborepo + pnpm. 모노레포: `apps/web`, `packages/{api,db}`(추후 `ui`, `services/ml`).

## 명령

```bash
pnpm --filter web dev      # 개발
pnpm test                  # Vitest (유닛/골든)
pnpm test:e2e              # Playwright (E2E/비주얼 골든)
pnpm --filter web build    # 빌드+타입체크
pnpm exec tsc -p packages/<pkg>/tsconfig.json   # 패키지 타입체크
pnpm --filter @closet/db db:generate            # 스키마→마이그레이션 SQL
```

## 컨벤션

- **비즈니스 로직·외부 호출은 `packages/api`** (웹/모바일 공유). `apps/web/server`는 오케스트레이션만.
- DB 컬럼은 **snake_case**(전역 `casing` 설정). Auth.js 테이블만 camelCase 컬럼 명시(어댑터 호환).
- 코드 참조 import alias: 앱 내부 `@/*` → `apps/web/src/*`.
- **UI 작업 전 `DESIGN.md`를 읽고**, 매 화면 끝에 그 안의 **안티-AI 체크리스트** 통과
  (보라 그라데이션/이모지/중앙정렬 히어로+카드3개/제네릭 카피/Inter 흔적 금지). 색은 콘텐츠(옷)가 낸다.
- 이모지는 제품 UI에 쓰지 않는다. 아이콘은 lucide.
- **TypeScript = "JS + 타입"**: React/JSX 그대로 쓰고 타입 주석은 최소화(대부분 자동 추론). 막히면 `any`로 넘어가도 됨(점진적). tRPC/Drizzle/Zod 타입 안전망이 핵심이라 **유지**(사용자 확정).

## ⚠️ Next.js 16 주의점 (학습데이터 15와 다름 — 코드 작성 전 `node_modules/next/dist/docs/` 확인)

- **async Request API 강제**: `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` 전부 `await`.
- **`middleware` → `proxy`**: `proxy.ts`의 `export function proxy()`. **node 런타임만**(edge ❌).
- **Turbopack 기본**: `--turbopack` 불필요. 커스텀 webpack 있으면 빌드 실패(→ `--webpack`).
- **`next/image`**: `images.domains` ❌ → **`remotePatterns`**. 기본 `qualities=[75]`, `minimumCacheTTL=4h`.
- **`revalidateTag(tag, profile)`** 2번째 인자 필수. 즉시 반영은 Server Action에서 `updateTag`.
- **`next lint` 제거** → ESLint CLI 직접(`eslint.config.mjs`, flat config). 빌드는 린트 안 함.
- **PPR**: `experimental.ppr` 제거 → `cacheComponents: true`. `serverRuntimeConfig`/`publicRuntimeConfig` 제거(→ env).
- Route Handler는 **기본 비캐시**(tRPC/Auth에 적합).

## 테스트

- Vitest: `**/src/**/*.test.ts`. Playwright: `e2e/*.spec.ts`(웹서버 자동 기동, 포트 3100).
- 비주얼 골든: `toHaveScreenshot`, 폰트 렌더 편차 위해 `maxDiffPixelRatio: 0.02`. 갱신 `--update-snapshots`.
- AI 출력 골든은 정확 텍스트 ❌ → **구조·핵심필드·점수범위(tolerance)** 단언.

## 안전/자율

- 모든 셸 명령은 **비대화형**으로(`--yes`, 설정 파일). pnpm 빌드 게이트는 `pnpm-workspace.yaml`의 `allowBuilds`로 관리.
- 커밋/푸시는 사용자가 요청할 때만.
