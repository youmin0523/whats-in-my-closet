# 옷장 지킴이 (What's in my closet)

![CI](https://github.com/youmin0523/whats-in-my-closet/actions/workflows/ci.yml/badge.svg)

> 내가 가진 옷을 디지털화해 **충동적인 중복 구매를 막고**, **어디 뒀는지 찾아주고**, **실시간으로 수량을 보여주는** AI 옷장 관리 플랫폼. 삼성 비스포크 AI 냉장고의 "안을 들여다본다"를 옷장에 적용했습니다. 한국 우선 · 반응형 웹.

소셜 로그인·AI·결제 등 모든 외부 의존은 **환경변수 유무로 자동 분기**합니다 — 키가 없으면 결정적 폴백으로 **전 기능이 키 0개로 데모**되고, 키를 넣는 순간 그 기능만 실서비스로 전환됩니다.

---

## 핵심 차별화 (경쟁 앱에 거의 없는 것)

1. **시각적 중복·유사 감지** — "이미 비슷한 옷 있음"을 0–100 점수로 능동 경고. 패션 임베딩(코사인) + 색상 거리(CIEDE2000) + 카테고리를 블렌드. 평가셋으로 임계값을 캘리브레이션(밴드 정확도 94.7%, 오경보 0).
2. **물리적 위치 추적** — "네이비 니트 = 안방 옷장 2번 서랍". 이름 검색 + **2D 드래그 배치도**. 어떤 경쟁 앱도 안 하는 기능.
3. **실시간 수량 인벤토리** — 카테고리·세부분류·계절·**색상별** 집계 + 중복 주의 콜아웃.

## 그 외 기능

날씨(기상청) 기반 코디 추천 · 퍼스널컬러 진단 · AI 스타일리스트 Q&A · 가상 피팅(인앱 카메라→합성) · **3D 옷장 둘러보기**(R3F) · 여러 벌 한번에 등록 · **택 스캔 → 실제 상품 카탈로그 매칭** · 위시리스트(살까말까) · 착용 기록·1회당 비용 · 코디 빌더 · 프리미엄 구독(무료 100벌 / 월 트라이온 크레딧).

## 기술 스택

- **웹** Next.js 16(App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · shadcn/ui(전면 리테마)
- **API** tRPC v11 (엔드투엔드 타입)
- **DB** PostgreSQL 16 + **pgvector**(HNSW 코사인) · Drizzle ORM
- **인증** Auth.js v5 (카카오·네이버·구글 + 개발 로그인 폴백)
- **AI** Claude(태깅·검출·택 OCR·추천) · Marqo-FashionSigLIP 임베딩(Replicate) · FASHN(가상 피팅)
- **그 외** Cloudinary(저장·배경제거) · 기상청 날씨 · 네이버 쇼핑검색 · PortOne/Toss 결제
- **3D** React Three Fiber + drei
- **모노레포** Turborepo + pnpm · **테스트** Vitest(유닛/골든) + Playwright(E2E/비주얼)

```
apps/web              Next.js 앱 (UI + 서버 오케스트레이션)
packages/api          비즈니스 로직·tRPC 라우터·외부 서비스 (웹/모바일 공유)
packages/db           Drizzle 스키마·마이그레이션·시드
```

## 빠른 시작 (키 0개)

```bash
pnpm install
pnpm --filter web dev          # http://localhost:3000
```

랜딩 → **"개발 로그인으로 둘러보기"** → 옷장 → 옷 추가(로컬 디스크 저장). DB·키 없이 전 화면이 폴백으로 동작합니다.

```bash
pnpm test           # Vitest (유닛·골든)
pnpm test:e2e       # Playwright (E2E·비주얼 골든)
pnpm --filter web build
```

**현재 GREEN:** Vitest 97 · Playwright E2E 12 · 타입체크 · 빌드.

## 실서비스로 전환 (키 연결)

`.env.example`를 루트 `.env`(+ `apps/web/.env.local`)로 복사해 채운 뒤:

```bash
pnpm --filter @closet/db db:migrate              # 스키마 적용(pgvector 포함)
pnpm --filter @closet/db exec tsx src/seed.ts    # 택소노미 105종 + 플랜 시드
```

필요한 키 전체 목록과 발급처는 [HANDOFF.md](./HANDOFF.md) 참고. `DATABASE_URL`만 넣으면 저장·집계가, AI 키를 넣으면 자동 태깅·중복감지·추천이 실제로 동작합니다.

## 문서

- [DESIGN.md](./DESIGN.md) — 아트디렉션 + 안티-AI 체크리스트
- [HANDOFF.md](./HANDOFF.md) — 현재 상태·실행법·키 연결 단계
- [PLAN-COVERAGE.md](./PLAN-COVERAGE.md) — 계획 대비 구현 현황 감사
- [CLAUDE.md](./CLAUDE.md) — 코딩 컨벤션 · Next.js 16 주의점

## 스크린샷

> _(준비중 — 옷장 그리드 · 인벤토리 대시보드 · 중복 경고 · 2D 배치도 · 3D 옷장)_

---

바이브코딩으로 개발하되 **UI는 AI스럽지 않게**(보라 그라데이션·이모지·중앙정렬 템플릿 배제, Pretendard, 색은 옷이 낸다) — 자세한 가드레일은 [DESIGN.md](./DESIGN.md).
