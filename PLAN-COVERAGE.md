# PLAN-COVERAGE — 플랜 대비 구현 현황 감사

플랜(`~/.claude/plans/clever-splashing-beacon.md`)의 모든 항목을 상태로 매핑. 누락 없이 추적.

**범례:** ✅ 완료(UI+백엔드, 키없이/또는 DB연결 후 동작) · 🔌 백엔드·서비스 연결됨(UI 최소/대기) · ⏸ 의도적 후속(플랜상 Phase 4-모바일/5 또는 외부 계정·SDK 필요)

---

## Phase 0 — 기반 + 디자인 시스템
| 항목 | 상태 |
|---|---|
| Turborepo 모노레포(pnpm), apps/web + packages/{api,db} | ✅ |
| Next.js 16 + React 19 + TS + Tailwind v4 + shadcn(리테마) | ✅ |
| 디자인 시스템(웜뉴트럴+올리브 토큰, Pretendard 자체호스팅, DESIGN.md, 안티-AI 체크리스트) | ✅ |
| tRPC v11 + Drizzle + PostgreSQL16 + pgvector | ✅ |
| Auth.js v5 (카카오·네이버·구글 + 개발 로그인 폴백) | ✅ |
| 테스트 인프라 (Vitest 33 + Playwright E2E 4 + 비주얼 골든) | ✅ |
| 수직 슬라이스(로그인→업로드→저장) | ✅ (키 없이 E2E 검증) |

## Phase 1 — 디지털 옷장 + 캡처 + 인벤토리 + 위치
| 항목 | 상태 |
|---|---|
| 디지털 옷장 그리드(`/closet`, 상세 링크) | ✅ |
| **아이템 상세**(`/closet/[id]`: 속성·색상·위치·비슷한옷) | ✅ |
| 실시간 **인벤토리 대시보드**(`/inventory`, 켤레 집계) | ✅ |
| 단일 캡처(`/closet/add`) + **인앱 카메라(getUserMedia)** | ✅ |
| **여러 벌 한번에 등록**(`/closet/capture`) | ✅ |
| **택 찍어서 등록**(`/closet/scan-tag`, Claude OCR) | ✅ |
| 캡처 파이프라인(배경제거·태깅·임베딩·색상추출) | ✅ (sharp 색상, Cloudinary bg, 서비스 폴백) |
| **위치 추적 #2**: "어디 뒀더라" 검색(`/locations`) · 위치 지정(아이템 상세) · 옷장 생성 | ✅ |
| 컨테이너 계층(서랍/박스) CRUD | ✅ (/locations 옷장별 칸 추가) |
| 단일사진 **다중 검출** 캡처(detect→crop→배치리뷰) | ✅ (/closet/capture, 키 없으면 한 벌 폴백) |
| 옷장 그리드 **필터**(카테고리·계절·**색상**) | ✅ (색상=dominant 색군 13종 `color_family`, 스와치 칩) |

## Phase 2 — 중복·유사 감지 + 사진 검색
| 항목 | 상태 |
|---|---|
| **중복 감지** "사기 전 확인"(`/check`): 임베딩+CIEDE2000 색상+카테고리 블렌드, 0–100 점수·판정 | ✅ |
| 사진으로 검색 / "비슷한 옷 찾기"(아이템 상세 similarTo) | ✅ |
| pgvector HNSW 코사인 + 리랭크 | ✅ |

## Phase 3 — 상황 인지 추천 + 날씨 + 퍼스널컬러
| 항목 | 상태 |
|---|---|
| **위치 기반 날씨**(`/today`, 기상청 + 폴백, 위치정보 동의) | ✅ (키 없이 동작) |
| 룰 레이어(기온/일교차/강수→제약) | ✅ (골든 테스트) |
| **퍼스널컬러 진단**(`/personal-color`, 4계절+팔레트) | ✅ |
| LLM 스타일링 레이어(Claude + 휴리스틱 폴백) | ✅ |
| **AI 스타일리스트 Q&A**(`/today` 챗) | ✅ |

## Phase 4 — 가상 피팅 + 모바일 + 결제
| 항목 | 상태 |
|---|---|
| **가상 피팅**(`/tryon`): 인앱 카메라(내 모습 촬영) + 옷 → FASHN 합성(폴백=원본) | ✅ (키 없이 데모) |
| try_on 영속화/상태(create/status/list) | ✅ 백엔드 |
| **Expo 모바일 앱** | ⏸ 플랜상 "후속" — 모노레포가 공유 구조(packages/{api,db})로 준비됨. Expo 추가 + 앱스토어 필요 |
| **결제(PortOne/Toss, KRW 프리미엄)** | ✅ 스캐폴드 — `subscriptions`+`plans`·플랜제한·billing 라우터·결제 서비스·`/settings` UI 구현(env-게이팅). **PG 가맹 키만** 넣으면 체크아웃 활성화 |

## Phase 5 — 실시간 라이브 AR 가상 피팅
| 항목 | 상태 |
|---|---|
| 라이브 AR(거울형) | ⏸ 명시적 스트레치 — AR SDK(MediaPipe/Banuba/DeepAR) 라이선스 필요. 정적 합성은 ✅ |

## Phase 6 — 3D 옷장 시뮬레이션
| 항목 | 상태 |
|---|---|
| **"내 옷장보기" 3D**(`/closet/3d`, R3F, 회전·줌·자동회전) | ✅ **위치·타입 연동 완료** — 입면(열×행)을 압출, 행거/선반/서랍 구분 렌더 |

---

## tRPC API 표면 (플랜 명세 대비)
- **garments**: list ✅(카테고리·계절·색상 필터) · byId ✅ · create ✅ · archive ✅ · delete ✅ · readTag ✅ · update ✅ · leastWorn ✅ · list3d ✅
- **capture**: startBulk ✅(자동태깅→**택소노미 ID 자동분류**) · detect ✅ · commit ✅(문자열→ID 리졸브 + 세부분류·계절 영속)
- **inventory**: counts ✅(카테고리·세부분류·계절·색상) · **duplicates ✅(중복 콜아웃)** · summary ✅
- **locations**: closets ✅ · containers ✅ · createCloset/Container ✅ · assign ✅ · find ✅ · **map ✅(2D 드래그 배치도)**
- **similarity**: checkDuplicate ✅ · similarTo ✅ (searchByPhoto=checkDuplicate로 커버)
- **outfits**: list ✅ · byId ✅ · create ✅ · addItem ✅ · logWear ✅ (UI 🔌)
- **recommendations**: today ✅ · ask ✅ · history ✅
- **tryon**: create ✅ · preview ✅ · status ✅ · list ✅
- **personalColor**: getProfile ✅ · submitQuiz ✅ · palette ✅
- **weather**: forecast ✅
- **billing**: plans ✅ · current ✅(사용량) · subscribe ✅ · cancel ✅ (env-게이팅 결제 PortOne/Toss)
- **garments.searchProduct** ✅ (택→네이버 쇼핑 카탈로그 매칭, env-게이팅)

## 서비스 레이어 (전부 env-게이팅 + 폴백)
embeddings(Replicate) · tagging(Claude) · detection(Claude) · tag-reader(Claude OCR) · weather(기상청) · styling+Q&A(Claude) · fashn(트라이온) · **billing(PortOne/Toss)** · **enrichment(네이버 쇼핑)** — 10종 ✅ (전부 재시도·폴백)

## 핵심 엔진 (순수 + 골든 테스트)
color/CIEDE2000(Sharma 검증) · 중복점수 블렌드 · 기상청 격자 · 추천 룰 · 퍼스널컬러 · 색군 분류 · 택소노미 리졸버 · 중복감지 평가/캘리브레이션 하네스 · 재시도/동시성/캐시 하드닝 · **플랜 제한** · **상품 쿼리빌더** — **Vitest 97** ✅

## 한국 우선
한국어 UI ✅ · 카카오/네이버 로그인 ✅ · 기상청 날씨 ✅ · 퍼스널컬러 ✅ · Pretendard ✅ · KRW 결제 ⏸(Phase 4)

---

## 추가 제품 기능 (플랜 외 보강 — 전부 ✅)
전역 네비(상단바 + 모바일 하단탭) · 다크모드 토글 · PWA(매니페스트) · 옷장 그리드 카테고리 필터 ·
**위시리스트(살까말까 + 중복확인 연동)** · **착용 기록 + 1회당 비용(cost-per-wear) + "잘 안 입는 옷"** ·
**코디 저장/목록 + 수동 코디 빌더** · **인앱 카메라(getUserMedia)** · 아이템 상세(위치 지정·비슷한 옷) ·
카테고리+**계절 필터** · 3D 실제 옷 색상 연동 ·
**세부 분류별 개수(셔츠·블라우스·맨투맨·후드·청바지·치마…) + 계절별 개수 인벤토리** · 옷 등록 시 카테고리·세부분류·계절 **수동 지정**.

### 폴리시 보강 라운드 (전부 ✅ · 키 불필요)
- **택소노미 10대분류 / 105세부분류**로 전면 확장(빈틈없이) — 옷 추가 폼·인벤토리·필터 자동 반영.
- **자동 태깅 → 택소노미 자동분류**: AI가 낸 카테고리/세부분류(자유 텍스트)를 `resolveTaxonomy`(순수·골든)로 DB ID에 매핑 → `여러 벌 한번에`·`멀티검출` 등록도 세부분류·계절 자동 채움. **태깅 프롬프트에 105종 슬러그 주입**으로 적중률↑.
- **옷장 색상 필터** + **인벤토리 색상별(플랜의 "색상 도넛" 시그니처: 비율 바+범례)**: dominant hex → 13색군(`color_family`, 마이그레이션 0004) + 스와치 칩. `hexToColorFamily` 순수·골든(23 케이스).
- **위치 2D 드래그 배치도**(`/locations/map`): 옷장→칸 그리드 + 미분류 트레이, 썸네일 드래그앤드롭으로 위치 저장(`locations.map` + `moveGarment` 서버액션).

### 업계 최상위 하드닝 라운드 (키 불필요 · "신뢰되는 차별화 + 운영 준비도")
- **중복감지 평가/캘리브레이션 하네스**(플랜 Phase 2 검증 구현): 라벨링 평가셋 38쌍(dup/similar/diff, 하드케이스 포함) + precision/recall/F1 + **임계값 스윕** + 골든 단언(`lib/eval/*`). 현 엔진 측정값 — **밴드정확도 94.7% · 중복재현율(safety) 100% · 오경보 0 · strong 정밀도 92.3%**, 스윕이 `strong=85`가 F1 최적점임을 입증. 실데이터 확보 시 평가셋만 교체해 재튜닝.
- **운영 하드닝 라이브러리**(`lib/resilience.ts`, 순수·골든 11): 지수 백오프 **재시도**(4xx 제외, 429/5xx/네트워크 재시도) · **동시성 제한**(`mapWithConcurrency`) · **단일비행 TTL 캐시**. tagging·embeddings·detection에 재시도+캐시 적용, `capture.startBulk`는 동시성 5로 제한(대량 업로드 시 모델 동시호출 폭주·레이트리밋 방지).
- **수익화 스캐폴드**(freemium): `subscriptions` 테이블(마이그레이션 **0005**) + 플랜 제한 로직(`lib/plan-limits.ts` 순수·골든 7: 무료 100벌·월 트라이온 크레딧) + **`billing` 라우터**(plans·current·subscribe·cancel) + **env-게이팅 결제 서비스**(PortOne/Toss; 키 없으면 즉시 적용 데모, 키 있으면 체크아웃 URL) + **설정/요금제 UI**(`/settings`, 사용량 바·플랜 카드).
- **상품 카탈로그 엔리치먼트**: `getEnrichmentService`(네이버 쇼핑검색, env-게이팅·재시도·캐시) + 순수 쿼리빌더/타이틀클린(`lib/enrichment-query.ts` 골든 4) + `garments.searchProduct` + **scan-tag 연동**(택 읽기→실제 상품 매칭 카드, 탭하면 자동 채움; 키 없으면 매칭 빈 배열로 기존 흐름 유지).
- **인벤토리 중복 콜아웃**(플랜 시그니처 비주얼 완성: see-inside 카운터+색상 도넛+**중복 콜아웃** 3종 전부): `inventory.duplicates`(세부분류+색군 ≥2 클러스터, 키 불필요) → "화이트 셔츠 3벌" 칩이 필터 옷장(`/closet?cat&color`)으로 링크.
- **아이템 인라인 편집**: `garments.update` 확장(이름·카테고리·세부분류·계절·상태) + `EditGarmentForm` + 상세페이지 "기본 정보 수정" 디스클로저.
- **저장소·CI**: GitHub 공개 저장소 + `README.md`(포트폴리오) + **GitHub Actions CI**(push/PR마다 타입체크·Vitest·빌드·E2E; 비주얼 골든은 OS별이라 CI 자동 스킵).

### 입면 빌더 + 온보딩 + 운영 라운드 (전부 ✅ · 키 불필요)
- **입면(elevation) 빌더**(`/locations/build`): 사용자가 옷장 앞면을 열·칸으로 조합(프리셋 5종 + 행거/선반/서랍/칸) → `locations.buildCloset`이 위치(`{col,row}`)·타입 컨테이너 생성 → **2D 배치도는 입면대로, 3D는 자동 압출**(열→x·행→y·타입별 비주얼). "사용자=입면 짜기 / 시스템=3D 모델링".
- **옷장 관리**: `renameCloset`·`deleteCloset`·`deleteContainer`(소유권 검증, 삭제 시 옷은 미분류로 안전 폴백) + `/locations` 인라인 편집·삭제 UI + `ConfirmButton`(파괴적 액션 가드).
- **첫 사용자 온보딩**(플랜 #1 리스크 대응): `/closet` 상단 시작 가이드 — `locations.map()` 한 번으로 등록/옷장/배치 3단계 상태 도출, 진행바·CTA, 완료 시 자동 숨김.
- **상업 품질 패스**: `(app)/error.tsx`·`loading.tsx`·`not-found.tsx`·`global-error.tsx`(브랜드 폴백) + 주요 라우트 11종 `metadata.title`.
- **라이브 실증 하네스**: `verify.live.test.ts`(`RUN_LIVE=1` opt-in, 평소 skip) — 태깅→임베딩(768d)→코사인→중복점수 실키 검증 + `VERIFY-LIVE.md` 런북.

### 야간 자율 라운드 (사용자 피드백 + 리뷰 반영, 전부 ✅)
- **입면 빌더 v2**: 선반·서랍을 좌우 2~3칸으로 **가로 분할**(열→행→칸 3단 모델, position에 `sub`). 옷장 **열 수 6→12**(붙박이 양문형 다중). 2D·3D 모두 분할 렌더, 3D 카메라 자동 거리.
- **3D 위치 강조 애니메이션**: 위치 검색 → `/closet/3d?c=<id>` → 해당 칸이 서랍이면 **앞으로 슬라이드(열림)** + "여기 있어요" 배지·펄스(R3F useFrame).
- **모든 템 등록 중복 안내**: `/closet/add` 저장 직후 `similarTo`(새 임베딩 재사용, ~무지연)로 "비슷한 옷 N벌" 비차단 표시(어떤 옷인지 썸네일·이름).
- **단일 등록 AI 자동 태깅**: 카테고리 미입력 시 `create`가 자동 분류(임베딩과 **동시 실행**, max not sum). 저장 후 수정 가능.
- **today Suspense 스트리밍**: 날씨·헤더 즉시, 느린 LLM 코디만 스트리밍(체감 지연↓).
- **embeddings fail-fast**: `Prefer: wait` 제거 → 비동기 create+폴링, 429 reset 존중·NaN 가드, 종료/timeout 비재시도. 최악 ~10분→수십 초.
- **코드리뷰 실버그 수정**: 위치지정 옷장 미배정 트레이 누락, 빈 칸/빈 열 렌더, scene3d 빈 컨테이너, delete 가드.
- **UI/UX·AI/AX**: 중복 점수 근거 노출, 📍→lucide, 모바일 추가 진입점, 빈상태 CTA, 포커스링·alt·대비, 스타일리스트 폴백 카피.
- **카피 자연어 스윕**(22파일) + 검증 하네스(`verify.live`)로 플래그십 실키 실증 완료.

## 요약
- **플랜 핵심(Phase 1–3 + 가상피팅 + 3D) + 위 추가 제품 기능까지 UI·백엔드 구현.** 대부분 키 없이 데모, 키/DB 넣으면 실서비스.
- **🔌 남은 것: 없음** — 모든 백엔드-연결 기능이 UI까지 구현됨.
- **⚠️ 폴리시: 없음** — 마지막 폴리시였던 위치 **2D 비주얼 맵 + 드래그 배정**까지 구현 완료(`/locations/map`).
- **⏸ (외부 계정/SDK만 남음, 코드는 스캐폴드 완료):** Expo 모바일(앱스토어) · 결제 **체크아웃 활성화**(PG 가맹 키 — 스캐폴드/UI는 완료) · 라이브 AR(AR SDK) · 상품 enrichment **실매칭**(네이버 키 — 서비스/연동은 완료).
- 위 ⏸ 항목은 플랜에서 원래 후속 단계로 명시됐고, 외부 계정/SDK/스토어가 있어야 진행 가능 — 토대(모노레포·plans 테이블·detection 서비스)는 준비 완료.
