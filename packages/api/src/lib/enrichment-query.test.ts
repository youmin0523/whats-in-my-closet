import { describe, expect, it } from "vitest";
import { buildProductQuery, cleanProductTitle } from "./enrichment-query";

describe("buildProductQuery", () => {
  it("joins brand + product name", () => {
    expect(
      buildProductQuery({ brand: "유니클로", productName: "에어리즘 크루넥" }),
    ).toBe("유니클로 에어리즘 크루넥");
  });
  it("handles missing fields and extra whitespace", () => {
    expect(buildProductQuery({ brand: null, productName: "  코튼 셔츠 " })).toBe(
      "코튼 셔츠",
    );
    expect(buildProductQuery({})).toBe("");
  });
});

describe("cleanProductTitle", () => {
  it("strips <b> highlight tags and entities", () => {
    expect(
      cleanProductTitle("<b>나이키</b> 에어포스 1 &amp; 로우 &quot;화이트&quot;"),
    ).toBe('나이키 에어포스 1 & 로우 "화이트"');
  });
  it("collapses whitespace", () => {
    expect(cleanProductTitle("코튼   셔츠\n  블루")).toBe("코튼 셔츠 블루");
  });
});
