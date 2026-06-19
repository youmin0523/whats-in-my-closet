/**
 * Freemium plan definitions + limit math (pure, golden-tested).
 * The DB `plans` table mirrors these for display/seed; this is the source of
 * truth for gating (item caps, monthly try-on credits). KRW pricing, Korea-first.
 */
export type PlanSlug = "free" | "premium" | "premium_plus";

export interface PlanDef {
  slug: PlanSlug;
  nameKo: string;
  maxItems: number | null; // null = unlimited
  monthlyTryonCredits: number;
  priceKrw: number;
  features: string[];
}

export const PLANS: Record<PlanSlug, PlanDef> = {
  free: {
    slug: "free",
    nameKo: "무료",
    maxItems: 100,
    monthlyTryonCredits: 5,
    priceKrw: 0,
    features: ["옷 최대 100벌", "중복 감지·위치 추적", "날씨 추천", "가상 피팅 월 5회"],
  },
  premium: {
    slug: "premium",
    nameKo: "프리미엄",
    maxItems: null,
    monthlyTryonCredits: 100,
    priceKrw: 4900,
    features: ["옷 무제한", "고급 AI 추천", "가상 피팅 월 100회", "3D 옷장"],
  },
  premium_plus: {
    slug: "premium_plus",
    nameKo: "프리미엄 플러스",
    maxItems: null,
    monthlyTryonCredits: 1000,
    priceKrw: 9900,
    features: ["프리미엄 전체", "가상 피팅 월 1000회", "우선 처리"],
  },
};

export const DEFAULT_PLAN: PlanSlug = "free";

export const PLAN_ORDER: PlanSlug[] = ["free", "premium", "premium_plus"];

export function planFor(slug?: string | null): PlanDef {
  if (slug && slug in PLANS) return PLANS[slug as PlanSlug];
  return PLANS[DEFAULT_PLAN];
}

export interface ItemAllowance {
  allowed: boolean;
  remaining: number | null; // null = unlimited
  max: number | null;
  unlimited: boolean;
}

/** Can this plan hold `adding` more items given `currentCount`? */
export function itemAllowance(
  slug: string | null | undefined,
  currentCount: number,
  adding = 1,
): ItemAllowance {
  const plan = planFor(slug);
  if (plan.maxItems == null) {
    return { allowed: true, remaining: null, max: null, unlimited: true };
  }
  return {
    allowed: currentCount + adding <= plan.maxItems,
    remaining: Math.max(0, plan.maxItems - currentCount),
    max: plan.maxItems,
    unlimited: false,
  };
}

export interface TryonAllowance {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/** Monthly try-on credits left for this plan given `usedThisMonth`. */
export function tryonAllowance(
  slug: string | null | undefined,
  usedThisMonth: number,
): TryonAllowance {
  const plan = planFor(slug);
  return {
    allowed: usedThisMonth < plan.monthlyTryonCredits,
    remaining: Math.max(0, plan.monthlyTryonCredits - usedThisMonth),
    limit: plan.monthlyTryonCredits,
  };
}
