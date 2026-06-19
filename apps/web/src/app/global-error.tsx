"use client";

// Replaces the root layout when an error escapes it, so it must render its own
// <html>/<body>. Kept dependency-free (no providers/fonts) for resilience.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f7f5ef",
          color: "#2a2723",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          잠시 문제가 생겼어요
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#6b6557", margin: 0 }}>
          페이지를 다시 불러와 주세요.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#3a3a2a",
            color: "#f7f5ef",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
