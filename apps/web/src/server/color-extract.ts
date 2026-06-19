import sharp from "sharp";

export interface ExtractedColor {
  hex: string;
  population: number; // 0..1
}

/**
 * Coarse dominant-color extraction. Downscale → quantize into 12-bit color bins →
 * return the most populous bins. Runs where the image buffer is available (upload).
 * Transparent (background-removed) pixels are flattened onto white first.
 */
export async function extractColors(
  buffer: Buffer,
  count = 3,
): Promise<ExtractedColor[]> {
  const size = 32;
  const { data, info } = await sharp(buffer)
    .resize(size, size, { fit: "inside" })
    .flatten({ background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  const bins = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i + 2 < data.length; i += ch) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const e = bins.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    e.r += r;
    e.g += g;
    e.b += b;
    e.n += 1;
    bins.set(key, e);
  }

  const total = [...bins.values()].reduce((s, e) => s + e.n, 0) || 1;
  return [...bins.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((e) => {
      const r = Math.round(e.r / e.n);
      const g = Math.round(e.g / e.n);
      const b = Math.round(e.b / e.n);
      const hex =
        "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      return { hex, population: e.n / total };
    });
}
