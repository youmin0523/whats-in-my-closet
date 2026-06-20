"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const MODES = [
  { href: "/closet/add", label: "한 장" },
  { href: "/closet/capture", label: "여러 벌" },
  { href: "/closet/scan-tag", label: "택 스캔" },
];

/** Segmented control linking the three registration modes (current highlighted). */
export function RegisterModeTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 rounded-lg border bg-secondary/40 p-1">
      {MODES.map((m) => {
        const active = pathname === m.href;
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
