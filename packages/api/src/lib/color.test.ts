import { describe, expect, it } from "vitest";
import { ciede2000, hexToLab, type Lab } from "./color";

describe("ciede2000", () => {
  it("is 0 for identical colors", () => {
    const lab: Lab = { L: 50, a: 0, b: 0 };
    expect(ciede2000(lab, lab)).toBeCloseTo(0, 6);
  });

  // Reference pairs from Sharma et al. (2005) CIEDE2000 test data.
  it("matches the Sharma reference values", () => {
    expect(
      ciede2000({ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 }),
    ).toBeCloseTo(2.0425, 3);
    expect(
      ciede2000({ L: 50, a: 2.5, b: 0 }, { L: 50, a: 0, b: -2.5 }),
    ).toBeCloseTo(4.3065, 3);
    expect(
      ciede2000({ L: 50, a: 2.5, b: 0 }, { L: 73, a: 25, b: -18 }),
    ).toBeCloseTo(27.1492, 3);
  });
});

describe("hexToLab", () => {
  it("maps pure white near L=100", () => {
    const w = hexToLab("#ffffff");
    expect(w.L).toBeCloseTo(100, 1);
    expect(w.a).toBeCloseTo(0, 1);
    expect(w.b).toBeCloseTo(0, 1);
  });

  it("maps pure black to L=0", () => {
    const k = hexToLab("#000000");
    expect(k.L).toBeCloseTo(0, 4);
  });

  it("supports 3-digit shorthand", () => {
    expect(hexToLab("#fff")).toEqual(hexToLab("#ffffff"));
  });
});
