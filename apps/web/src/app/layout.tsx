import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});

const SITE_URL = "https://whats-in-my-closet-web.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "What's in my closet — 옷장 지킴이",
    template: "%s · 옷장 지킴이",
  },
  description:
    "내 옷장을 디지털로 들여다보세요. 비슷한 옷 중복 구매를 막고, 어디에 뒀는지 찾고, 오늘 뭘 입을지 추천받는 AI 옷장 지킴이.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "옷장 지킴이",
    title: "옷장 지킴이 — 가진 옷을 알면, 충동구매가 멈춥니다",
    description:
      "비슷한 옷 중복 구매를 막고, 어디 뒀는지 찾고, 오늘 뭘 입을지까지. AI 옷장 관리.",
  },
  twitter: {
    card: "summary_large_image",
    title: "옷장 지킴이",
    description: "AI 옷장 관리 — 중복 구매 방지·위치 추적·실시간 인벤토리.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2723" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={pretendard.variable}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
