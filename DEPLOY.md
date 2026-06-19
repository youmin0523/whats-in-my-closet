# 배포 가이드 — Vercel + Supabase

옷장 지킴이를 **Vercel(웹) + Supabase(Postgres+pgvector) + Cloudinary(이미지)** 로 배포합니다. 한국 우선이라 **서울 리전**으로 맞춥니다. 코드는 이미 배포 준비가 끝났고, 아래는 계정·키 연결 절차입니다.

```
사용자 ── Vercel (Next.js, icn1 서울) ── Supabase Postgres (pgvector, ap-northeast-2 서울)
                  └── Cloudinary (이미지 저장·배경제거)
                  └── Anthropic · Replicate · 기상청 · FASHN · 네이버 · PortOne/Toss (env 게이팅)
```

---

## 1. Supabase — DB 만들기

1. [supabase.com](https://supabase.com) → **New project** → **Region: Northeast Asia (Seoul)** 선택, DB 비밀번호 설정.
2. **pgvector 확장 켜기** — Dashboard → SQL Editor에서:
   ```sql
   create extension if not exists vector;
   ```
   (Database → Extensions에서 `vector` 토글로도 가능)
3. **연결 문자열 2개**를 복사 (Project Settings → Database → Connection string):
   - **Transaction pooler** (포트 `6543`, `...pooler.supabase.com`) → **앱용**(`DATABASE_URL`). 서버리스 다중 연결을 풀러가 처리.
   - **Direct connection** (포트 `5432`) → **마이그레이션용**. DDL은 세션 모드가 필요.

> 풀러(6543)는 prepared statement를 지원하지 않으므로 앱에선 **`DATABASE_PREPARE=false`** 를 함께 설정합니다(코드가 이 env를 읽어 자동 처리).

## 2. 마이그레이션 + 시드 (로컬에서 1회)

**다이렉트(5432) URL**로 스키마를 적용하고 택소노미·플랜을 시드합니다:

```bash
# 루트 .env 에 다이렉트 URL을 잠깐 넣고:
#   DATABASE_URL="postgresql://postgres:비번@db.xxxx.supabase.co:5432/postgres"
pnpm --filter @closet/db db:migrate                 # 0000~0005 적용 (pgvector 포함)
pnpm --filter @closet/db add -D tsx                  # 최초 1회
pnpm --filter @closet/db exec tsx src/seed.ts        # 택소노미 105종 + 플랜 시드
```

이후 스키마 변경 시에도 동일하게 다이렉트 URL로 `db:migrate`를 돌립니다.

## 3. Cloudinary — 이미지 (프로덕션 **필수**)

Vercel은 파일시스템이 읽기전용이라 로컬 업로드 폴백이 동작하지 않습니다. [cloudinary.com](https://cloudinary.com) 무료 계정 → Dashboard에서 `cloud_name` · `api_key` · `api_secret` 확보. (AI 배경제거는 Cloudinary Add-on에서 **Cloudinary AI Background Removal** 활성화)

## 4. Vercel — 웹 배포

1. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub의 `whats-in-my-closet` import.
2. **설정:**
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (자동 감지)
   - **Node.js Version:** **22.x** (Settings → General — pnpm 11.7이 Node 22.13+ 필요)
   - Install/Build/Output: 기본값(자동) — `transpilePackages`로 워크스페이스 패키지를 함께 빌드하므로 추가 설정 불필요.
3. **Region(서울):** Settings → Functions → **Region = Seoul (icn1)**.
4. **환경변수**(Settings → Environment Variables, Production) — 아래 체크리스트 참고. 최소: `DATABASE_URL`(풀러 6543), `DATABASE_PREPARE=false`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `CLOUDINARY_*`, 그리고 **소셜 로그인 1개 이상**.
5. **Deploy.** 이후 `main`에 push하면 자동 재배포(+ PR 프리뷰 배포).

### OAuth 리다이렉트 URI (프로덕션 도메인 등록)

각 콘솔에서 콜백 URL을 프로덕션 도메인으로 추가:
- 카카오: `https://<도메인>/api/auth/callback/kakao`
- 네이버: `https://<도메인>/api/auth/callback/naver`
- 구글: `https://<도메인>/api/auth/callback/google`

## 5. 배포 후 점검

- [ ] 로그인(소셜) 동작 — `AUTH_DEV_LOGIN`은 프로덕션에서 **끄기**(미설정이면 자동 비활성).
- [ ] 옷 업로드 → Cloudinary에 저장되는지(로컬 `/uploads/*` 아님).
- [ ] 옷장/인벤토리에 데이터 표시(= DB 연결 OK).
- [ ] `/api/trpc`·`/api/auth` 응답.
- [ ] (키 넣은 기능) 자동 태깅·중복감지·날씨·추천 동작.

---

## 프로덕션 환경변수 체크리스트

**필수**
| 변수 | 값/출처 |
|---|---|
| `DATABASE_URL` | Supabase **풀러(6543)** 문자열 |
| `DATABASE_PREPARE` | `false` (풀러 사용 시) |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_TRUST_HOST` | `true` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud_name |
| 소셜 로그인 **1개 이상** | `AUTH_KAKAO_ID/SECRET` 등 |

**기능별(선택)** — 없으면 해당 기능만 폴백
`ANTHROPIC_API_KEY`(태깅·검출·OCR·추천) · `REPLICATE_API_TOKEN`+`REPLICATE_FASHION_EMBED_VERSION`(임베딩·중복감지) · `KMA_SERVICE_KEY`(날씨) · `FASHN_API_KEY`(피팅) · `NAVER_SEARCH_CLIENT_ID/SECRET`(상품매칭) · `PORTONE_API_SECRET` 또는 `TOSS_SECRET_KEY`(결제)

**튜닝(선택)** `DATABASE_POOL_MAX`(서버리스 권장 `1`) · `ANTHROPIC_MODEL` · `BILLING_CHECKOUT_URL`

> ⚠️ **하지 말 것:** 프로덕션에 `AUTH_DEV_LOGIN=true` 설정(로그인 우회 노출). 미설정 시 프로덕션에서 자동 비활성됩니다.

---

## 자주 묻는 것 (FAQ)

- **로컬 업로드가 프로덕션에서 안 돼요** → 정상. Vercel FS는 읽기전용이라 Cloudinary 키가 **필수**입니다.
- **DB 연결이 가끔 끊겨요 / prepared statement 에러** → 앱은 **풀러(6543) + `DATABASE_PREPARE=false`**, 마이그레이션만 **다이렉트(5432)**.
- **마이그레이션을 배포 빌드에서 자동으로?** → 권장하지 않음(빌드마다 실행 위험). 지금은 다이렉트 URL로 수동 실행. 자동화하려면 별도 GitHub Actions(마이그레이션 파일 변경 시)로 분리.
- **인메모리 캐시(재시도/엔리치먼트)는?** → 서버리스에선 인스턴스마다 분리·비영속 → 자동으로 캐시 미스로 폴백(동작에 문제 없음).
- **CI는?** → 이미 GitHub Actions로 push마다 타입체크·테스트·빌드·E2E 검증(`.github/workflows/ci.yml`). 배포(CD)와 별개.
