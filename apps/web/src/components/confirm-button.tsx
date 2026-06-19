"use client";

import { cn } from "@/lib/utils";

/** A submit button that asks for confirmation before letting the form post. */
export function ConfirmButton({
  message,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={cn(
        "text-xs text-muted-foreground transition-colors hover:text-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
