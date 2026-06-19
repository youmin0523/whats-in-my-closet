/** Korean 4-season personal color (퍼스널컬러). Pure axis → season/palette mapping. */

export type Season = "spring" | "summer" | "fall" | "winter";
export type Undertone = "warm" | "cool";
export type ValueAxis = "light" | "deep";
export type Chroma = "bright" | "muted";

export interface PersonalColor {
  season: Season;
  undertone: Undertone;
  value: ValueAxis;
  chroma: Chroma;
  palette: string[];
}

const PALETTES: Record<Season, string[]> = {
  spring: ["#FFB7A5", "#FFD58A", "#F7E1A0", "#A8D5A2", "#FF9E7A"],
  summer: ["#A7C7E7", "#CDB4DB", "#F4A6C0", "#B5D8D1", "#9AB7D3"],
  fall: ["#B5651D", "#8A6D3B", "#6B8E23", "#C08457", "#7E5A3C"],
  winter: ["#0F4C81", "#C81D52", "#1B1B3A", "#2E8B9E", "#111111"],
};

export function seasonFromAxes(undertone: Undertone, value: ValueAxis): Season {
  if (undertone === "warm") return value === "light" ? "spring" : "fall";
  return value === "light" ? "summer" : "winter";
}

export function buildPersonalColor(
  undertone: Undertone,
  value: ValueAxis,
  chroma: Chroma,
): PersonalColor {
  const season = seasonFromAxes(undertone, value);
  return { season, undertone, value, chroma, palette: PALETTES[season] };
}

export function paletteForSeason(season: Season): string[] {
  return PALETTES[season];
}
