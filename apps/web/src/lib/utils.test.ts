import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("resolves conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy values and keeps the rest", () => {
    expect(cn("text-sm", false, undefined, "font-medium")).toBe(
      "text-sm font-medium",
    );
  });
});
