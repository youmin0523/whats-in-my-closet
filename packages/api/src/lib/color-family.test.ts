import { describe, expect, it } from "vitest";
import { hexToColorFamily } from "./color";

describe("hexToColorFamily", () => {
  const cases: [string, string][] = [
    // neutrals
    ["#FFFFFF", "white"],
    ["#FAFAFA", "white"],
    ["#000000", "black"],
    ["#111111", "black"],
    ["#808080", "gray"],
    ["#9CA3AF", "gray"],
    // warm neutrals
    ["#E8DCC0", "beige"],
    ["#5C4033", "brown"],
    // chromatic anchors
    ["#FF0000", "red"],
    ["#DC2626", "red"],
    ["#F97316", "orange"],
    ["#EAB308", "yellow"],
    ["#16A34A", "green"],
    ["#00FF00", "green"],
    ["#2563EB", "blue"],
    ["#0000FF", "blue"],
    ["#000080", "navy"],
    ["#7C3AED", "purple"],
    ["#800080", "purple"],
    ["#EC4899", "pink"],
    ["#FFC0CB", "pink"],
  ];

  for (const [hex, expected] of cases) {
    it(`${hex} → ${expected}`, () => {
      expect(hexToColorFamily(hex)).toBe(expected);
    });
  }

  it("accepts shorthand hex", () => {
    expect(hexToColorFamily("#fff")).toBe("white");
    expect(hexToColorFamily("#000")).toBe("black");
  });
});
