import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb, schema } from "@closet/db";

const isProd = process.env.NODE_ENV === "production";
export const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" || !isProd;

const providers: Provider[] = [];
// Real social providers are added only when their keys exist (auto-read AUTH_*).
if (process.env.AUTH_KAKAO_ID) providers.push(Kakao);
if (process.env.AUTH_NAVER_ID) providers.push(Naver);
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);

// Dev fallback: passwordless login so the app is fully usable without OAuth keys.
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "개발 로그인",
      credentials: { name: { label: "이름", type: "text" } },
      authorize: (creds) => {
        const name =
          typeof creds?.name === "string" && creds.name.trim()
            ? creds.name.trim()
            : "개발자";
        return { id: "dev-user", name, email: "dev@closet.local" };
      },
    }),
  );
}

// Adapter (user/account persistence) only when a database is configured.
const adapter = process.env.DATABASE_URL
  ? DrizzleAdapter(getDb(), {
      usersTable: schema.users,
      accountsTable: schema.accounts,
      sessionsTable: schema.sessions,
      verificationTokensTable: schema.verificationTokens,
    })
  : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  // Real secret required in production; fallback keeps dev/build working.
  secret: process.env.AUTH_SECRET ?? "dev-insecure-secret-change-in-production",
  trustHost: true,
  // Credentials provider requires JWT sessions.
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
