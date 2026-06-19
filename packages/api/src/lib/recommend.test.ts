import { describe, expect, it } from "vitest";
import { constraintsSummaryKo, deriveConstraints } from "./recommend";
import { buildPersonalColor, seasonFromAxes } from "./personal-color";

describe("deriveConstraints", () => {
  it("cold + rain + big diurnal → heavy outer, removable, water-resistant, dark", () => {
    const c = deriveConstraints({ tempMax: 4, tempMin: -6, pop: 70, pty: 1 });
    expect(c.outerWeight).toBe("heavy");
    expect(c.requireRemovableLayer).toBe(true);
    expect(c.preferWaterResistant).toBe(true);
    expect(c.preferDark).toBe(true);
    expect(c.avoidMaterials).toContain("suede");
  });

  it("hot + dry + small diurnal → no outer, no rain handling", () => {
    const c = deriveConstraints({ tempMax: 30, tempMin: 25, pop: 0, pty: 0 });
    expect(c.outerWeight).toBe("none");
    expect(c.requireRemovableLayer).toBe(false);
    expect(c.preferWaterResistant).toBe(false);
    expect(c.allowedSeasons).toContain("summer");
  });

  it("summary mentions the temps", () => {
    const w = { tempMax: 18, tempMin: 7, pop: 0, pty: 0 };
    expect(constraintsSummaryKo(w, deriveConstraints(w))).toContain("18°");
  });
});

describe("personal color", () => {
  it("maps axes to the right season", () => {
    expect(seasonFromAxes("warm", "light")).toBe("spring");
    expect(seasonFromAxes("warm", "deep")).toBe("fall");
    expect(seasonFromAxes("cool", "light")).toBe("summer");
    expect(seasonFromAxes("cool", "deep")).toBe("winter");
  });

  it("builds a palette", () => {
    const pc = buildPersonalColor("cool", "deep", "bright");
    expect(pc.season).toBe("winter");
    expect(pc.palette.length).toBeGreaterThan(0);
  });
});
