/**
 * Recommendation rule layer (Phase 3). Pure: weather → hard outfit constraints.
 * The LLM styling layer (Claude) then picks outfits from owned items within these.
 */

export interface WeatherInput {
  tempMax: number;
  tempMin: number;
  /** precipitation probability (%) */
  pop: number;
  /** precipitation type code (0 = none) */
  pty: number;
}

export type OuterWeight = "heavy" | "light" | "optional" | "none";

export interface OutfitConstraints {
  allowedSeasons: string[];
  outerWeight: OuterWeight;
  requireRemovableLayer: boolean;
  preferWaterResistant: boolean;
  preferDark: boolean;
  avoidMaterials: string[];
  diurnalRange: number;
}

export function deriveConstraints(w: WeatherInput): OutfitConstraints {
  const diurnal = w.tempMax - w.tempMin;
  const t = w.tempMax;

  let outerWeight: OuterWeight;
  const allowedSeasons: string[] = [];
  if (t <= 5) {
    outerWeight = "heavy";
    allowedSeasons.push("winter");
  } else if (t <= 15) {
    outerWeight = "light";
    allowedSeasons.push("winter", "fall", "spring");
  } else if (t <= 22) {
    outerWeight = "optional";
    allowedSeasons.push("fall", "spring");
  } else {
    outerWeight = "none";
    allowedSeasons.push("summer", "spring");
  }

  const rain = w.pop >= 60 || w.pty !== 0;
  return {
    allowedSeasons,
    outerWeight,
    requireRemovableLayer: diurnal >= 10,
    preferWaterResistant: rain,
    preferDark: rain,
    avoidMaterials: rain ? ["suede"] : [],
    diurnalRange: diurnal,
  };
}

/** Short Korean weather/constraint strip for the Today screen. */
export function constraintsSummaryKo(
  w: WeatherInput,
  c: OutfitConstraints,
): string {
  const parts = [`오늘 ${Math.round(w.tempMax)}° / ${Math.round(w.tempMin)}°`];
  if (c.requireRemovableLayer) parts.push("일교차 큼 — 탈착 레이어 권장");
  if (c.preferWaterResistant) parts.push("강수 — 방수·어두운 색");
  if (c.outerWeight === "heavy") parts.push("두꺼운 아우터");
  else if (c.outerWeight === "light") parts.push("가벼운 아우터");
  else if (c.outerWeight === "none") parts.push("아우터 불필요");
  return parts.join(" · ");
}
