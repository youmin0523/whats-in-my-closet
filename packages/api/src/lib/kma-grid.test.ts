import { describe, expect, it } from "vitest";
import { latLngToGrid } from "./kma-grid";

describe("latLngToGrid (KMA)", () => {
  it("maps Seoul to (60, 127)", () => {
    expect(latLngToGrid(37.5665, 126.978)).toEqual({ nx: 60, ny: 127 });
  });

  it("maps Busan to (98, 76)", () => {
    expect(latLngToGrid(35.1796, 129.0756)).toEqual({ nx: 98, ny: 76 });
  });

  it("maps Paju to a northern grid (differs from Busan)", () => {
    const paju = latLngToGrid(37.7599, 126.78);
    const busan = latLngToGrid(35.1796, 129.0756);
    expect(paju).not.toEqual(busan);
    // Paju sits well north of Busan → larger ny.
    expect(paju.ny).toBeGreaterThan(busan.ny);
  });
});
