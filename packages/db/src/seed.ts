/**
 * Seed the garment taxonomy (categories + subcategories).
 * Run once a DATABASE_URL is configured and the migration is applied:
 *   pnpm --filter @closet/db add -D tsx        # one-time
 *   pnpm --filter @closet/db exec tsx src/seed.ts
 * Idempotent (onConflictDoNothing), so it is safe to re-run.
 */
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), "../../.env") });

import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { categories, plans, subcategories } from "./schema";

/** Freemium plans (mirrors packages/api lib/plan-limits PLANS). */
const PLAN_ROWS = [
  { slug: "free", nameKo: "무료", maxItems: 100, monthlyTryonCredits: 5, priceKrw: 0, features: ["옷 최대 100벌", "중복 감지·위치 추적", "날씨 추천", "가상 피팅 월 5회"] },
  { slug: "premium", nameKo: "프리미엄", maxItems: null, monthlyTryonCredits: 100, priceKrw: 4900, features: ["옷 무제한", "고급 AI 추천", "가상 피팅 월 100회", "3D 옷장"] },
  { slug: "premium_plus", nameKo: "프리미엄 플러스", maxItems: null, monthlyTryonCredits: 1000, priceKrw: 9900, features: ["프리미엄 전체", "가상 피팅 월 1000회", "우선 처리"] },
];

type Cat = {
  slug: string;
  nameKo: string;
  nameEn: string;
  pair?: boolean;
  subs: Array<[slug: string, ko: string, en: string]>;
};

const DATA: Cat[] = [
  {
    slug: "tops",
    nameKo: "상의",
    nameEn: "Tops",
    subs: [
      ["short_tee", "반팔 티셔츠", "Short-sleeve T-shirt"],
      ["long_tee", "긴팔 티셔츠", "Long-sleeve T-shirt"],
      ["shirt", "셔츠", "Shirt"],
      ["blouse", "블라우스", "Blouse"],
      ["polo", "카라/폴로", "Polo"],
      ["sweatshirt", "맨투맨", "Sweatshirt"],
      ["hoodie", "후드티", "Hoodie"],
      ["knit", "니트", "Knit"],
      ["sweater", "스웨터", "Sweater"],
      ["turtleneck", "터틀넥/폴라", "Turtleneck"],
      ["sleeveless", "민소매/나시", "Sleeveless"],
      ["crop", "크롭", "Crop top"],
      ["knit_vest", "니트조끼", "Knit vest"],
    ],
  },
  {
    slug: "bottoms",
    nameKo: "하의",
    nameEn: "Bottoms",
    subs: [
      ["jeans", "청바지", "Jeans"],
      ["skinny", "스키니진", "Skinny jeans"],
      ["bootcut", "부츠컷", "Bootcut"],
      ["chinos", "면바지", "Chinos"],
      ["slacks", "슬랙스", "Slacks"],
      ["corduroy", "코듀로이팬츠", "Corduroy pants"],
      ["cargo", "카고바지", "Cargo pants"],
      ["wide", "와이드팬츠", "Wide pants"],
      ["jogger", "조거팬츠", "Jogger"],
      ["sweatpants", "트레이닝팬츠", "Sweatpants"],
      ["shorts", "반바지", "Shorts"],
      ["denim_shorts", "데님반바지", "Denim shorts"],
      ["leggings", "레깅스", "Leggings"],
      ["mini_skirt", "미니스커트", "Mini skirt"],
      ["long_skirt", "롱스커트", "Long skirt"],
    ],
  },
  {
    slug: "outerwear",
    nameKo: "아우터",
    nameEn: "Outerwear",
    subs: [
      ["coat", "코트", "Coat"],
      ["trench", "트렌치코트", "Trench coat"],
      ["duffle", "더플코트", "Duffle coat"],
      ["short_padding", "숏패딩", "Short puffer"],
      ["long_padding", "롱패딩", "Long puffer"],
      ["padding_vest", "패딩조끼", "Puffer vest"],
      ["jacket", "재킷", "Jacket"],
      ["denim_jacket", "데님재킷", "Denim jacket"],
      ["leather_jacket", "가죽재킷", "Leather jacket"],
      ["blazer", "블레이저", "Blazer"],
      ["cardigan", "가디건", "Cardigan"],
      ["fleece", "플리스", "Fleece"],
      ["windbreaker", "바람막이", "Windbreaker"],
      ["field_jacket", "야상", "Field jacket"],
      ["mustang", "무스탕", "Shearling"],
      ["zipup", "후드집업", "Zip-up hoodie"],
    ],
  },
  {
    slug: "dresses",
    nameKo: "원피스",
    nameEn: "Dresses",
    subs: [
      ["mini_dress", "미니 원피스", "Mini dress"],
      ["midi_dress", "미디 원피스", "Midi dress"],
      ["long_dress", "롱 원피스", "Long dress"],
      ["shirt_dress", "셔츠 원피스", "Shirt dress"],
      ["knit_dress", "니트 원피스", "Knit dress"],
      ["slip_dress", "슬립 원피스", "Slip dress"],
      ["jumpsuit", "점프수트", "Jumpsuit"],
    ],
  },
  {
    slug: "shoes",
    nameKo: "신발",
    nameEn: "Shoes",
    pair: true,
    subs: [
      ["sneakers", "스니커즈", "Sneakers"],
      ["running", "운동화", "Running shoes"],
      ["boots", "부츠", "Boots"],
      ["chelsea", "첼시부츠", "Chelsea boots"],
      ["walker", "워커", "Walker boots"],
      ["loafers", "로퍼", "Loafers"],
      ["dress_shoes", "구두", "Dress shoes"],
      ["heels", "힐", "Heels"],
      ["sandals", "샌들", "Sandals"],
      ["mule", "뮬/블로퍼", "Mules"],
      ["slippers", "슬리퍼", "Slippers"],
      ["flats", "플랫슈즈", "Flats"],
      ["ugg", "어그", "Uggs"],
    ],
  },
  {
    slug: "socks",
    nameKo: "양말",
    nameEn: "Socks",
    pair: true,
    subs: [
      ["no_show", "덧신", "No-show"],
      ["ankle", "발목양말", "Ankle"],
      ["crew", "크루양말", "Crew"],
      ["knee", "니삭스", "Knee-high"],
      ["stockings", "스타킹", "Stockings"],
    ],
  },
  {
    slug: "bags",
    nameKo: "가방",
    nameEn: "Bags",
    subs: [
      ["tote", "토트백", "Tote"],
      ["shoulder", "숄더백", "Shoulder bag"],
      ["cross", "크로스백", "Crossbody"],
      ["backpack", "백팩", "Backpack"],
      ["clutch", "클러치", "Clutch"],
      ["mini_bag", "미니백", "Mini bag"],
      ["eco", "에코백", "Eco bag"],
      ["waist", "웨이스트백", "Waist bag"],
      ["duffle_bag", "더플백", "Duffle bag"],
      ["pouch", "파우치", "Pouch"],
    ],
  },
  {
    slug: "accessories",
    nameKo: "액세서리",
    nameEn: "Accessories",
    subs: [
      ["belt", "벨트", "Belt"],
      ["scarf", "스카프/머플러", "Scarf"],
      ["tie", "넥타이", "Tie"],
      ["necklace", "목걸이", "Necklace"],
      ["earring", "귀걸이", "Earrings"],
      ["ring", "반지", "Ring"],
      ["bracelet", "팔찌", "Bracelet"],
      ["watch", "시계", "Watch"],
      ["glasses", "안경", "Glasses"],
      ["sunglasses", "선글라스", "Sunglasses"],
      ["gloves", "장갑", "Gloves"],
      ["hair", "헤어액세서리", "Hair accessory"],
    ],
  },
  {
    slug: "headwear",
    nameKo: "모자",
    nameEn: "Headwear",
    subs: [
      ["ballcap", "볼캡", "Ball cap"],
      ["snapback", "스냅백", "Snapback"],
      ["beanie", "비니", "Beanie"],
      ["bucket", "버킷햇", "Bucket hat"],
      ["fedora", "페도라", "Fedora"],
      ["beret", "베레모", "Beret"],
      ["straw", "밀짚모자", "Straw hat"],
    ],
  },
  {
    slug: "underwear",
    nameKo: "이너웨어",
    nameEn: "Innerwear",
    subs: [
      ["inner_top", "상의 이너", "Inner top"],
      ["inner_bottom", "하의 이너", "Inner bottom"],
      ["bra", "브라", "Bra"],
      ["panties", "팬티", "Panties"],
      ["slip", "슬립", "Slip"],
      ["shapewear", "보정속옷", "Shapewear"],
      ["pajamas", "잠옷/파자마", "Pajamas"],
    ],
  },
];

async function main() {
  const db = getDb();
  for (const [i, c] of DATA.entries()) {
    await db
      .insert(categories)
      .values({
        slug: c.slug,
        nameKo: c.nameKo,
        nameEn: c.nameEn,
        sort: i,
        countsAsPair: c.pair ?? false,
      })
      .onConflictDoNothing();

    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, c.slug));
    if (!cat) continue;

    for (const [j, [slug, ko, en]] of c.subs.entries()) {
      await db
        .insert(subcategories)
        .values({ categoryId: cat.id, slug, nameKo: ko, nameEn: en, sort: j })
        .onConflictDoNothing();
    }
  }
  for (const p of PLAN_ROWS) {
    await db.insert(plans).values(p).onConflictDoNothing();
  }

  console.log("✓ taxonomy + plans seeded");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
