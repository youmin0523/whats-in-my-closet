# 라이브 실증 런북 (LIVE VERIFICATION)

지금까지 모든 기능은 **"키 없이 데모 모드"**로만 검증됐다. 이 문서는 실제 키·DB로
**플래그십 차별화(중복 감지)가 끝까지 작동하는지**를 두 경로로 증명한다.

- **경로 A — 파이프라인 단위 검증**(빠름, DB 불필요): 태깅(OpenAI) → 임베딩(Replicate)
  → 코사인 → 중복 점수까지 실제 호출로 확인. **3분.**
- **경로 B — 배포 앱 수동 스모크**(전체 흐름): 실제로 옷을 등록하고 비슷한 옷을 `/check`에
  넣어 "비슷한 옷 있음" 경고가 뜨는지 확인.

---

## 경로 A — 파이프라인 단위 검증 (권장 시작점)

### 필요한 키
| 검증 | 환경변수 | 비고 |
|---|---|---|
| 태깅 | `OPENAI_API_KEY` (또는 `ANTHROPIC_API_KEY`) | gpt-4o-mini |
| 임베딩 | `REPLICATE_API_TOKEN` **+** `REPLICATE_FASHION_EMBED_VERSION` | ⚠️ **버전 해시 둘 다** 필요 — 토큰만 있으면 결정적 폴백으로 빠짐 |

`REPLICATE_FASHION_EMBED_VERSION`은 `krthr/clip-embeddings` 모델의 버전 해시다.
Replicate 모델 페이지(`replicate.com/krthr/clip-embeddings` → API → 최신 버전 id)에서 복사.

### 실행 (PowerShell)
```powershell
$env:RUN_LIVE = "1"
$env:OPENAI_API_KEY = "sk-..."
$env:REPLICATE_API_TOKEN = "r8_..."
$env:REPLICATE_FASHION_EMBED_VERSION = "<clip-embeddings 버전 해시>"
# (선택) 실제 내 옷 사진 3장으로 더 정확히: 비슷한 2장 + 다른 1장, 공개 URL
# $env:LIVE_IMG_A = "https://.../navy-tee-front.jpg"
# $env:LIVE_IMG_B = "https://.../navy-tee-angle.jpg"
# $env:LIVE_IMG_C = "https://.../sneaker.jpg"
pnpm --filter @closet/api exec vitest run verify.live
```

### 통과 기준 (콘솔 출력)
- `[tag] isReal=true provider=openai model=gpt-4o-mini` + `category`가 채워진 태그 JSON
- `[embed] isReal=true`, 벡터 길이 **768**
- `[embed] cos(A,B) > cos(A,C)` — **비슷한 옷이 다른 옷보다 가깝다(핵심 불변식)**
- `[score] A~B duplicate=<0보다 큰 점수> (soft|strong)`

세 줄이 다 나오면 **차별화 #1(시각 중복 감지)이 실제 모델로 작동**함이 증명된 것.
기본 샘플 URL은 위키미디어 공개 이미지라 404일 수 있으니, **정확한 테스트는
`LIVE_IMG_A/B/C`에 본인 옷 사진(비슷한 2장+다른 1장)을 넣는 것**을 권장.

> 끝나면 키 환경변수는 셸에서 사라진다(영속 저장 안 함). `RUN_LIVE` 없으면 이 테스트는
> 자동 skip되어 일반 `pnpm test`(97개)에 영향 없음.

---

## 경로 B — 배포 앱 전체 흐름 스모크

배포 앱(`whats-in-my-closet-web.vercel.app`)에서 실제 사용자 흐름을 확인.

### 사전 조건 (Vercel 환경변수)
- `DATABASE_URL` (Supabase) — **마이그레이션 적용 완료** 상태여야 함
  (`pnpm --filter @closet/db db:migrate` 또는 Supabase SQL로 0001~0005 적용)
- `OPENAI_API_KEY`, `REPLICATE_API_TOKEN` **+** `REPLICATE_FASHION_EMBED_VERSION`,
  `CLOUDINARY_*`(업로드/배경제거)
- 소셜 로그인(카카오/구글/네이버) 중 하나

### 절차
1. 로그인 → `/closet/add`에서 **옷 1벌 등록**(예: 네이비 니트 사진). 저장되면 옷장 그리드에 보임.
   - 확인: 자동 태깅으로 카테고리/색상이 채워졌는가(태깅·색상 작동).
2. `/check`(중복 확인)로 가서 **같은 니트의 다른 각도 사진**(또는 비슷한 옷)을 올림.
   - **기대: "비슷한 옷 있음/거의 같은 옷 보유" 경고 + 매치 카드**가 뜬다.
   - 이게 뜨면 등록 시 임베딩 저장 → pgvector 검색 → 점수 블렌드까지 **실데이터로 작동**.
3. (선택) `/locations/build`로 옷장 입면 짜기 → `/locations/map`에서 그 옷을 칸에 배치 →
   `/closet/3d`에서 옷장·칸별로 렌더되는지 확인(위치 차별화 + 3D).

### 흔한 함정
- 경고가 안 뜸 → 십중팔구 **임베딩이 폴백**. `REPLICATE_FASHION_EMBED_VERSION`이
  Vercel에 설정됐는지 먼저 확인(경로 A로 빠르게 격리 가능).
- 업로드 실패 → `CLOUDINARY_*` 키/`remotePatterns` 확인.
- 빈 화면/500 → 마이그레이션 미적용(테이블 없음). `0001~0005` 적용 확인.

---

## 요약
- **경로 A**가 가장 빠르고 격리된 증명(키만 있으면 3분, DB 불필요).
- **경로 B**는 사용자 관점 전체 흐름.
- 두 경로 모두 핵심은 하나: **REPLICATE 임베딩이 폴백이 아니라 실제로 도는가** —
  `REPLICATE_FASHION_EMBED_VERSION`까지 설정됐는지가 관건.
