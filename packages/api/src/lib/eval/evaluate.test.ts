import { describe, expect, it } from "vitest";
import { DUP_EVAL_SET } from "./dup-eval-set";
import { buildReport, evaluate, scorePair, sweep } from "./evaluate";

describe("duplicate-detection calibration", () => {
  const m = evaluate();

  it("never hard-warns on an unrelated item (no false STRONG on diff)", () => {
    expect(m.falseStrongOnDiff).toBe(0);
  });

  it("does not flag unrelated items at all (no false alarms on diff)", () => {
    expect(m.falseAlarmsOnDiff).toBe(0);
  });

  it("catches every true duplicate at least as a soft warning (safety recall)", () => {
    expect(m.dupRecallAtSoft).toBe(1);
  });

  it("hard-warns the large majority of true duplicates", () => {
    expect(m.dupRecallAtStrong).toBeGreaterThanOrEqual(0.85);
  });

  it("keeps STRONG warnings precise", () => {
    expect(m.strongPrecision).toBeGreaterThanOrEqual(0.85);
  });

  it("agrees with ground-truth bands on most pairs", () => {
    expect(m.bandAccuracy).toBeGreaterThanOrEqual(0.85);
  });
});

describe("threshold sweep", () => {
  it("trades recall for precision as the threshold rises", () => {
    const rows = sweep([80, 85, 90]);
    const low = rows[0]!;
    const high = rows[2]!;
    expect(low.recall).toBeGreaterThanOrEqual(high.recall);
    expect(high.precision).toBeGreaterThanOrEqual(low.precision);
  });
});

describe("eval set hygiene", () => {
  it("has a balanced, non-trivial set with hard cases", () => {
    const byLabel = (l: string) => DUP_EVAL_SET.filter((p) => p.label === l).length;
    expect(DUP_EVAL_SET.length).toBeGreaterThanOrEqual(30);
    expect(byLabel("dup")).toBeGreaterThanOrEqual(8);
    expect(byLabel("similar")).toBeGreaterThanOrEqual(8);
    expect(byLabel("diff")).toBeGreaterThanOrEqual(8);
    expect(DUP_EVAL_SET.some((p) => p.note.includes("hard"))).toBe(true);
  });

  it("scores every pair in 0..100", () => {
    for (const p of DUP_EVAL_SET) {
      const { score } = scorePair(p);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("buildReport", () => {
  it("renders a calibration report", () => {
    const r = buildReport();
    expect(r).toContain("calibration");
    expect(r).toContain("dup recall");
    expect(r).toContain("threshold sweep");
  });
});
