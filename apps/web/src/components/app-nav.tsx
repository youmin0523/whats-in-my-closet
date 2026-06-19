"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Home,
  MapPin,
  Moon,
  Plus,
  Sparkles,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/closet", label: "옷장", icon: Home },
  { href: "/today", label: "추천", icon: Sparkles },
  { href: "/locations", label: "위치", icon: MapPin },
  { href: "/inventory", label: "인벤토리", icon: BarChart3 },
];

// mobile bottom tabs put the primary action (옷 추가) in the center
const ADD = { href: "/closet/add", label: "추가", icon: Plus };
const MOBILE_NAV = [NAV[0]!, NAV[1]!, ADD, NAV[2]!, NAV[3]!];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="테마 전환"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </button>
  );
}

export function AppNav({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-10">
          <Link href="/closet" className="text-sm font-semibold tracking-tight">
            옷장 지킴이
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  isActive(n.href) && "bg-accent font-medium text-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {children}
          </div>
        </div>
      </header>

      {/* mobile bottom tabs — primary action (추가) in the center */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-background md:hidden">
        {MOBILE_NAV.map((n) => {
          const Icon = n.icon;
          const isAdd = n.href === ADD.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-xs",
                !isAdd && isActive(n.href)
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              {isAdd ? (
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="size-4" />
                </span>
              ) : (
                <Icon className="size-5" />
              )}
              <span className={cn(isAdd && "text-primary")}>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
