import { describe, expect, it } from "vitest";
import {
  itemAllowance,
  planFor,
  PLANS,
  tryonAllowance,
} from "./plan-limits";

describe("planFor", () => {
  it("resolves known slugs", () => {
    expect(planFor("premium").slug).toBe("premium");
  });
  it("falls back to free for unknown/empty", () => {
    expect(planFor(null).slug).toBe("free");
    expect(planFor("bogus").slug).toBe("free");
  });
});

describe("itemAllowance", () => {
  it("enforces the free cap at the boundary", () => {
    expect(itemAllowance("free", 99).allowed).toBe(true);
    expect(itemAllowance("free", 100).allowed).toBe(false);
    expect(itemAllowance("free", 99).remaining).toBe(1);
    expect(itemAllowance("free", 150).remaining).toBe(0);
  });
  it("treats premium as unlimited", () => {
    const a = itemAllowance("premium", 99999);
    expect(a.allowed).toBe(true);
    expect(a.unlimited).toBe(true);
    expect(a.remaining).toBeNull();
  });
  it("respects the `adding` count", () => {
    expect(itemAllowance("free", 98, 3).allowed).toBe(false);
    expect(itemAllowance("free", 97, 3).allowed).toBe(true);
  });
});

describe("tryonAllowance", () => {
  it("counts monthly credits down", () => {
    expect(tryonAllowance("free", 0)).toEqual({ allowed: true, remaining: 5, limit: 5 });
    expect(tryonAllowance("free", 5)).toEqual({ allowed: false, remaining: 0, limit: 5 });
    expect(tryonAllowance("premium", 50).remaining).toBe(50);
  });
});

describe("plan catalog", () => {
  it("is ordered free < premium < premium_plus by price", () => {
    expect(PLANS.free.priceKrw).toBeLessThan(PLANS.premium.priceKrw);
    expect(PLANS.premium.priceKrw).toBeLessThan(PLANS.premium_plus.priceKrw);
  });
});
