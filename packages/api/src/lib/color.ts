/**
 * Color math for the duplicate/similarity engine.
 * Pure functions — no I/O, fully unit-tested. sRGB(D65) → CIE Lab → CIEDE2000.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}
export interface Lab {
  L: number;
  a: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace(/^#/, "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbToXyz({ r, g, b }: Rgb): { x: number; y: number; z: number } {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return {
    x: R * 0.4124 + G * 0.3576 + B * 0.1805,
    y: R * 0.2126 + G * 0.7152 + B * 0.0722,
    z: R * 0.0193 + G * 0.1192 + B * 0.9505,
  };
}

export function xyzToLab({
  x,
  y,
  z,
}: {
  x: number;
  y: number;
  z: number;
}): Lab {
  // D65 reference white
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;
  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function rgbToLab(rgb: Rgb): Lab {
  return xyzToLab(rgbToXyz(rgb));
}
export function hexToLab(hex: string): Lab {
  return rgbToLab(hexToRgb(hex));
}

const deg2rad = (d: number) => (d * Math.PI) / 180;
const rad2deg = (r: number) => (r * 180) / Math.PI;

/** CIEDE2000 color difference (ΔE00). 0 = identical; ~2.3 = just noticeable. */
export function ciede2000(lab1: Lab, lab2: Lab): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  let h1p = rad2deg(Math.atan2(b1, a1p));
  if (h1p < 0) h1p += 360;
  let h2p = rad2deg(Math.atan2(b2, a2p));
  if (h2p < 0) h2p += 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = 0;
  if (C1p * C2p !== 0) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= 180) dhp = diff;
    else if (diff > 180) dhp = diff - 360;
    else dhp = diff + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
    else hbarp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(deg2rad(hbarp - 30)) +
    0.24 * Math.cos(deg2rad(2 * hbarp)) +
    0.32 * Math.cos(deg2rad(3 * hbarp + 6)) -
    0.2 * Math.cos(deg2rad(4 * hbarp - 63));

  const dtheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const SL =
    1 +
    (0.015 * Math.pow(Lbarp - 50, 2)) /
      Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(deg2rad(2 * dtheta)) * RC;

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
      Math.pow(dCp / (kC * SC), 2) +
      Math.pow(dHp / (kH * SH), 2) +
      RT * (dCp / (kC * SC)) * (dHp / (kH * SH)),
  );
}

/** Map a ΔE00 distance to a 0..1 color similarity (1 = identical). */
export function colorSimilarity(lab1: Lab, lab2: Lab, maxDe = 40): number {
  const de = ciede2000(lab1, lab2);
  return Math.max(0, Math.min(1, 1 - de / maxDe));
}

/* ------------------------------------------------------------------ *
 * Coarse color families — for the closet's "색상" filter.
 * A garment's dominant hex is bucketed into one of 13 human color names
 * (stored as garment_colors.color_family) so users can filter by color.
 * Deterministic + golden-tested. Naming is approximate by design.
 * ------------------------------------------------------------------ */
export type ColorFamily =
  | "white"
  | "black"
  | "gray"
  | "beige"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "navy"
  | "purple"
  | "pink";

export const COLOR_FAMILY_KO: Record<ColorFamily, string> = {
  white: "화이트",
  black: "블랙",
  gray: "그레이",
  beige: "베이지",
  brown: "브라운",
  red: "레드",
  orange: "오렌지",
  yellow: "옐로우",
  green: "그린",
  blue: "블루",
  navy: "네이비",
  purple: "퍼플",
  pink: "핑크",
};

/** Ordered list (slug, 한글) for rendering filter chips. */
export const COLOR_FAMILIES: [ColorFamily, string][] = (
  Object.keys(COLOR_FAMILY_KO) as ColorFamily[]
).map((k) => [k, COLOR_FAMILY_KO[k]]);

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

/** Bucket a hex color into one of the COLOR_FAMILY names. */
export function hexToColorFamily(hex: string): ColorFamily {
  const { h, s, l } = rgbToHsl(hexToRgb(hex));

  // Achromatic (low saturation, incl. cool/warm-tinted grays) → white/gray/black.
  if (s <= 0.15) {
    if (l >= 0.85) return "white";
    if (l <= 0.2) return "black";
    return "gray";
  }
  // Extremes still read as white/black even with a little chroma.
  if (l >= 0.95) return "white";
  if (l <= 0.07) return "black";

  // Warm light low-chroma tones read as beige; dark warm tones as brown.
  const warm = h < 70 || h >= 350;
  if (warm && l >= 0.72 && s <= 0.78) return "beige";
  if (h >= 8 && h < 45 && l <= 0.42) return "brown";

  // Chromatic by hue angle.
  if (h < 12 || h >= 345) return l >= 0.72 ? "pink" : "red";
  if (h < 45) return "orange";
  if (h < 68) return "yellow";
  if (h < 168) return "green";
  if (h < 255) return l <= 0.3 ? "navy" : "blue";
  if (h < 292) return "purple";
  // magenta zone (292–345°): dark → purple, light → pink
  return l <= 0.5 ? "purple" : "pink";
}
