# HANDOFF — What's in my closet (옷장 지킴이)

Phase 0(기반 + 디자인 시스템 + **수직 슬라이스**) 자율 구축 완료. 전체 설계는
[`~/.claude/plans/clever-splashing-beacon.md`](../../.claude/plans/clever-splashing-beacon.md),
디자인 규칙 [`DESIGN.md`](./DESIGN.md), 코딩 컨벤션 [`CLAUDE.md`](./CLAUDE.md), **플랜 대비 구현 현황 [`PLAN-COVERAGE.md`](./PLAN-COVERAGE.md)**.

## ✅ 완료 — 전부 GREEN (타입체크 · Vitest 97 · Playwright E2E 12 · 웹 빌드)

| 영역 | 상태 |
|---|---|
| Turborepo 모노레포 (pnpm) | `apps/web` + `packages/{api,db}` |
| 디자인 시스템 | Tailwind v4 토큰(웜뉴트럴+올리브) · 자체호스팅 **Pretendard** · shadcn(리테마) · 에디토리얼 랜딩 |
| tRPC v11 | `health` · `system` · `garments` 라우터 + route handler + RSC caller + `protectedProcedure` |
| **Auth.js v5** | JWT 세션 + 조건부 Drizzle 어댑터 + **개발 로그인 폴백** + 카카오/네이버/구글(env-게이팅) + `/login` `/closet` |
| **업로드** | Cloudinary + **로컬 디스크 폴백** (키 없이 동작) |
| **DB** | Drizzle 스키마(Auth + 택소노미 + garments/**embeddings pgvector HNSW**) + 마이그레이션 SQL + 시드 + 지연 클라이언트 |
| 테스트 | **Vitest 86** + **E2E 10**(개발로그인·업로드·날씨·캡처·색상필터·2D맵, 키 없이 통과) + 비주얼 골든 |

### Phase 1–4 연결 — 엔진 · API · 핵심 UI (전부 GREEN)
| 영역 | 상태 |
|---|---|
| **중복감지 엔진** (`packages/api/src/lib`) | CIEDE2000 색상거리(**Sharma 레퍼런스 검증**) · 중복점수 블렌드/판정 · 기상청 격자변환(서울·부산 검증) — 골든 테스트 |
| **AI 서비스** (`packages/api/src/services`) | 임베딩(Marqo-FashionSigLIP/Replicate) · 태깅·검출(Claude) — **env-게이팅 + 결정적 폴백**(키 없이 동작·테스트) |
| **tRPC** | `inventory.counts` · `similarity.checkDuplicate`/`similarTo`(pgvector HNSW 코사인 + 점수 리랭크) · `garments.create`에 임베딩 저장 연결 |
| **인벤토리 대시보드** | `/inventory` "see inside" 카운터 UI(카테고리별 수량/켤레) |
| **스키마** | Phase 1 테이블(위치·컨테이너·아웃핏·착용로그·캡처세션) + 마이그레이션 0001 (총 17테이블) |

**전 Phase 백엔드 연결 완료 — 키 넣으면 그 기능만 실서비스로 전환:**
> - **Phase 1·2** — `garments`·`inventory`·**`similarity`(임베딩+CIEDE2000 색상)**·`locations`·`capture` 라우터 · 색상추출(sharp) 저장 · Cloudinary 배경제거 · UI: `/inventory`, **`/check`(사기 전 중복확인)**
> - **Phase 3** — **`weather`(기상청 + 키 없이 폴백 동작)** · `recommendations`(룰 레이어) · `personalColor` · UI: **`/today`(위치정보 동의 → 동네 날씨)**
> - **Phase 4** — `fashn` 서비스 + `tryon` 라우터
> - 서비스 5종(embeddings·tagging·detection·weather·fashn) 전부 **env-게이팅 + 결정적 폴백** → 키 없이 파이프라인 동작·테스트
> - 핵심 수식(`lib/`: color·scoring·kma-grid·recommend·personal-color)은 **순수 + 골든 테스트**(Vitest 33)
>
> **추가 완료:** **3D 옷장 둘러보기(`/closet/3d`, R3F)** · **여러 벌 한번에 등록(`/closet/capture`)** · **택 찍어서 등록(`/closet/scan-tag`, Claude 비전 OCR로 브랜드·상품명·사이즈·소재 추출)** · 추천 **LLM 스타일링 레이어(Claude + 휴리스틱 폴백)**.
> **추가 완료 2:** **퍼스널컬러 진단(`/personal-color`)** · **가상 피팅(`/tryon`, FASHN/폴백)** · **위치 찾기(`/locations`, "어디 뒀더라?" 검색)**.
> **추가 완료 3:** **아이템 상세(`/closet/[id]`: 위치 지정·비슷한 옷)** · **인앱 카메라(getUserMedia)** · **AI 스타일리스트 Q&A** · outfits·archive/delete·status·summary·palette 라우터. → 전체 현황은 **[PLAN-COVERAGE.md](./PLAN-COVERAGE.md)**.
> **🔌 남은 것: 없음** — 그리드 필터·컨테이너 UI·**단일사진 다중검출 캡처**·배치리뷰·아웃핏·update 전부 구현 완료.
> **⏸ 의도적 후속(외부 의존, 플랜상 후속 단계):** Expo 모바일(Phase4) · 결제(Phase4, PG 가맹) · 라이브 AR(Phase5, AR SDK) · 상품검색 enrichment(쇼핑 API).
>
> **추가 완료 4 (앱 완성도):** **전역 네비(상단바+모바일 하단탭)·다크모드·PWA** · **그리드 필터** · **위시리스트** · **착용기록·1회당 비용·안 입는 옷** · **코디 저장/목록**.
> **추가 완료 5 (폴리시 라운드, 키 불필요):** **택소노미 10/105 전면 확장** · **자동 태깅→택소노미 자동분류**(`resolveTaxonomy` 순수·골든, 태깅 프롬프트에 슬러그 주입) · **옷장 색상 필터**(13색군 `color_family`, 마이그레이션 **0004**) · **위치 2D 드래그 배치도**(`/locations/map`).
> **추가 완료 6 (업계 최상위 하드닝, 키 불필요):** **중복감지 평가/캘리브레이션 하네스**(`lib/eval/*` — 평가셋 38쌍·precision/recall/F1·임계값 스윕·골든; 측정 밴드정확도 94.7%/오경보 0, `strong=85`가 F1 최적점 입증) · **운영 하드닝**(`lib/resilience.ts` — 재시도 백오프·동시성 제한·단일비행 TTL 캐시; tagging/embeddings/detection 적용, `startBulk` 동시성 5).
> **추가 완료 7 (수익화 + 카탈로그, env-게이팅):** **수익화 스캐폴드** — `subscriptions`(마이그레이션 **0005**)·플랜 제한(`lib/plan-limits.ts`)·`billing` 라우터·결제 서비스(PortOne/Toss)·**`/settings` 요금제 UI**(키 없으면 즉시 적용 데모, 키 넣으면 체크아웃) · **상품 카탈로그 엔리치먼트** — 네이버 쇼핑검색 서비스·`garments.searchProduct`·**scan-tag 매칭 카드**(택→실제 상품, 탭하면 채움). **Vitest 97 · E2E 12.**
> **추가 완료 8 (저장소·CI·보강):** **GitHub 공개 저장소**(youmin0523/whats-in-my-closet) + `README.md` + **GitHub Actions CI**(typecheck·Vitest·빌드·E2E; 비주얼 골든 CI 자동 스킵) · **인벤토리 중복 콜아웃**(`inventory.duplicates`) · **아이템 인라인 편집**(`garments.update` 확장 + `EditGarmentForm`, 상세 "기본 정보 수정").
> **현재 라우트(19 페이지):** `/` `/login` `/closet` `/closet/[id]` `/closet/add` `/closet/capture` `/closet/scan-tag` `/closet/3d` `/inventory` `/check` `/today` `/personal-color` `/tryon` `/locations` `/locations/map` `/wishlist` `/outfits` `/outfits/new` `/settings` + `/api/{auth,trpc}`.

## 🎯 지금 당장 동작 (키 0개)

```bash
pnpm install
pnpm --filter web dev        # http://localhost:3000
```
→ 랜딩 → **"개발 로그인으로 둘러보기"** → `/closet` → **옷 추가**(이미지 업로드 → 로컬 저장).
DB가 없으면 "DB 미연결 — 저장 안 됨" 안내만 뜨고 업로드 자체는 동작. (E2E로 검증됨)

```bash
pnpm test        # Vitest (유닛/골든)
pnpm test:e2e    # Playwright (개발로그인+업로드, 비주얼 골든)
pnpm --filter web build
```

## 🔑 내일: 키만 넣으면 단계별로 실서비스 전환

`.env.example` → 루트 **`.env`** + **`apps/web/.env.local`** 복사 후 채우기:

1. **DB 영속화** (가장 중요) — `DATABASE_URL`에 postgres 비밀번호. 그 후:
   ```bash
   # createdb closet_dev  (최초 1회)
   pnpm --filter @closet/db db:migrate          # 스키마 적용(pgvector 확장 포함)
   pnpm --filter @closet/db add -D tsx
   pnpm --filter @closet/db exec tsx src/seed.ts # 택소노미 시드
   ```
   → 업로드한 옷이 **저장·목록 표시**됨(코드는 이미 완성, DB만 붙으면 동작).
2. **`AUTH_SECRET`** — `npx auth secret`. (프로덕션 세션 안정화)
3. **소셜 로그인** — 카카오/네이버/구글 키 추가 시 자동으로 버튼 노출. (프로덕션에선 개발 로그인 자동 비활성)
4. **Cloudinary** — `CLOUDINARY_*` 추가 시 업로드가 로컬→클라우드(+AI 배경제거)로 자동 전환.
5. **AI/날씨** (Phase 1+) — `ANTHROPIC_API_KEY`(태깅/검출/추천), `REPLICATE_API_TOKEN`(임베딩), `FASHN_API_KEY`(피팅), `KMA_SERVICE_KEY`(날씨).

> 동작 원리: 모든 외부 의존은 **env 유무로 자동 분기**(폴백↔실서비스). 키를 넣는 순간 그 기능만 실서비스로 바뀜.

## 다음 작업 (Phase 1 — 플랜 참조)

벌크 캡처 파이프라인(멀티아이템 검출→배경제거→태깅→임베딩→배치 리뷰) · 실시간 인벤토리 대시보드 ·
위치 시스템. AI 파이프라인은 `packages/api/src/services/*`(cloudinary 외 detection/tagging/embeddings/color)부터.

## 위생 (선택)
- **git**: ✅ 초기화·푸시됨 → https://github.com/youmin0523/whats-in-my-closet (main). `.gitignore`가 `.env`·업로드·`node_modules`·로컬설정 제외. 키 넣을 때 만들 `.env`는 자동 제외됨.
- **pre-commit**: `pnpm add -Dw husky lint-staged` → `npx husky init` → 훅에서 `pnpm test`.

## 테스트 규율 (요청 반영)
기능과 테스트를 함께. Vitest(유닛/골든) 상시, Playwright E2E+비주얼 골든으로 회귀 감시.
AI 출력 골든은 **구조·핵심필드·점수범위(tolerance)** 로 단언(정확 텍스트 ❌).
