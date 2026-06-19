"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type OnboardingStep = {
  key: string;
  label: string;
  desc: string;
  href: string;
  cta: string;
  done: boolean;
};

const KEY = "closet-onboarding-dismissed";

/**
 * First-run guide. Walks a new user through the three steps that make the app
 * useful — register clothes, compose a closet, place items — and disappears
 * once they're done (the plan's #1 risk: onboarding friction).
 */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const [dismissed, setDismissed] = useState(true); // default hidden until mount
  useEffect(() => {
    setDismissed(localStorage.getItem(KEY) === "1");
  }, []);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  if (allDone || dismissed) return null;

  // first not-yet-done step is the one we nudge
  const active = steps.find((s) => !s.done);

  return (
    <section className="mt-6 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold tracking-tight">시작 가이드</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            세 단계면 옷장 지킴이를 제대로 쓸 수 있어요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setDismissed(true);
          }}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          나중에
        </button>
      </div>

      {/* progress */}
      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {doneCount}/{steps.length}
        </span>
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {steps.map((s) => {
          const isActive = !s.done && s.key === active?.key;
          return (
            <li
              key={s.key}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                s.done && "border-transparent bg-secondary/40",
                isActive && "border-primary/40 bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                  s.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {s.done ? <Check className="size-3.5" /> : steps.indexOf(s) + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    s.done && "text-muted-foreground line-through",
                  )}
                >
                  {s.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.desc}
                </p>
              </div>
              {!s.done && (
                <Link
                  href={s.href}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border text-foreground hover:bg-accent",
                  )}
                >
                  {s.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
