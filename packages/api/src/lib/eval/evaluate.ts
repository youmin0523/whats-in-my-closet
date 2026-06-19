/**
 * Metrics for the duplicate-detection eval set — pure, deterministic.
 * Runs the real `scoring.ts` engine over labeled pairs and reports how well the
 * blend weights + thresholds separate dup / similar / diff. Use the threshold
 * sweep to re-calibrate `SCORING.strong` / `SCORING.soft` against measured data.
 */
import { hexToLab } from "../color";
import { duplicateScore, SCORING, type DuplicateVerdict } from "../scoring";
import { DUP_EVAL_SET, type EvalLabel, type EvalPair } from "./dup-eval-set";

const VERDICT_TO_LABEL: Record<DuplicateVerdict, EvalLabel> = {
  strong: "dup",
  soft: "similar",
  none: "diff",
};

export function scorePair(p: EvalPair): {
  score: number;
  verdict: DuplicateVerdict;
} {
  const r = duplicateScore({
    embeddingCosine: p.embeddingCosine,
    labA: hexToLab(p.hexA),
    labB: hexToLab(p.hexB),
    sameSubcategory: p.sameSubcategory,
    sameCategory: p.sameCategory,
  });
  return { score: r.score, verdict: r.verdict };
}

const LABELS: EvalLabel[] = ["dup", "similar", "diff"];
const emptyConfusion = (): Record<EvalLabel, Record<EvalLabel, number>> => ({
  dup: { dup: 0, similar: 0, diff: 0 },
  similar: { dup: 0, similar: 0, diff: 0 },
  diff: { dup: 0, similar: 0, diff: 0 },
});

export interface Metrics {
  n: number;
  /** exact 3-band agreement (predicted verdict band === ground-truth label) */
  bandAccuracy: number;
  /** true dups scoring ≥ soft (caught at all). The safety-critical recall. */
  dupRecallAtSoft: number;
  /** true dups scoring ≥ strong (hard-warned) */
  dupRecallAtStrong: number;
  /** of pairs predicted 'strong', the fraction that are truly dup */
  strongPrecision: number;
  /** true 'diff' pairs wrongly hard-warned (must be 0) */
  falseStrongOnDiff: number;
  /** true 'diff' pairs flagged at all (≥ soft) — false alarms */
  falseAlarmsOnDiff: number;
  confusion: Record<EvalLabel, Record<EvalLabel, number>>;
}

export function evaluate(set: EvalPair[] = DUP_EVAL_SET): Metrics {
  const confusion = emptyConfusion();
  let correct = 0;
  let dups = 0;
  let dupAtSoft = 0;
  let dupAtStrong = 0;
  let predStrong = 0;
  let predStrongDup = 0;
  let falseStrongOnDiff = 0;
  let falseAlarmsOnDiff = 0;

  for (const p of set) {
    const { score, verdict } = scorePair(p);
    const predicted = VERDICT_TO_LABEL[verdict];
    confusion[p.label][predicted] += 1;
    if (predicted === p.label) correct += 1;

    if (p.label === "dup") {
      dups += 1;
      if (score >= SCORING.soft) dupAtSoft += 1;
      if (score >= SCORING.strong) dupAtStrong += 1;
    }
    if (verdict === "strong") {
      predStrong += 1;
      if (p.label === "dup") predStrongDup += 1;
    }
    if (p.label === "diff") {
      if (verdict === "strong") falseStrongOnDiff += 1;
      if (score >= SCORING.soft) falseAlarmsOnDiff += 1;
    }
  }

  return {
    n: set.length,
    bandAccuracy: round(correct / set.length),
    dupRecallAtSoft: round(dups ? dupAtSoft / dups : 1),
    dupRecallAtStrong: round(dups ? dupAtStrong / dups : 1),
    strongPrecision: round(predStrong ? predStrongDup / predStrong : 1),
    falseStrongOnDiff,
    falseAlarmsOnDiff,
    confusion,
  };
}

export interface SweepRow {
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
}

/**
 * Treating "dup" as the positive class, sweep the hard-warn threshold and report
 * precision/recall/F1 at each. The knee of this curve is the calibration target.
 */
export function sweep(
  thresholds: number[],
  set: EvalPair[] = DUP_EVAL_SET,
): SweepRow[] {
  const scored = set.map((p) => ({ label: p.label, score: scorePair(p).score }));
  return thresholds.map((t) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (const s of scored) {
      const positive = s.score >= t;
      if (s.label === "dup" && positive) tp += 1;
      else if (s.label !== "dup" && positive) fp += 1;
      else if (s.label === "dup" && !positive) fn += 1;
    }
    const precision = tp + fp ? tp / (tp + fp) : 1;
    const recall = tp + fn ? tp / (tp + fn) : 1;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return {
      threshold: t,
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
    };
  });
}

const round = (x: number) => Math.round(x * 1000) / 1000;

/** Human-readable calibration report (for `console.log` / dev tooling). */
export function buildReport(set: EvalPair[] = DUP_EVAL_SET): string {
  const m = evaluate(set);
  const lines: string[] = [];
  lines.push("=== Duplicate-detection calibration ===");
  lines.push(
    `set=${m.n}  thresholds: strong=${SCORING.strong} soft=${SCORING.soft}`,
  );
  lines.push(
    `band accuracy:        ${pct(m.bandAccuracy)}  (predicted dup/similar/diff vs ground truth)`,
  );
  lines.push(
    `dup recall @soft:     ${pct(m.dupRecallAtSoft)}  (true dups caught at all — safety)`,
  );
  lines.push(`dup recall @strong:   ${pct(m.dupRecallAtStrong)}`);
  lines.push(`strong precision:     ${pct(m.strongPrecision)}`);
  lines.push(`false STRONG on diff: ${m.falseStrongOnDiff}  (must be 0)`);
  lines.push(`false alarms on diff: ${m.falseAlarmsOnDiff}`);
  lines.push("confusion (rows=truth, cols=pred)  dup / similar / diff");
  for (const t of LABELS) {
    const r = m.confusion[t];
    lines.push(`  ${t.padEnd(8)} ${pad(r.dup)} ${pad(r.similar)} ${pad(r.diff)}`);
  }
  lines.push("threshold sweep (dup as positive):  th  prec  rec   f1");
  for (const s of sweep([80, 82, 84, 85, 86, 88, 90], set)) {
    lines.push(
      `  ${pad(s.threshold)} ${s.precision.toFixed(2)}  ${s.recall.toFixed(2)}  ${s.f1.toFixed(2)}`,
    );
  }
  return lines.join("\n");
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const pad = (x: number) => String(x).padStart(4);
