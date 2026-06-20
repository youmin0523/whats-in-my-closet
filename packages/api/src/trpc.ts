import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { OpenApiMeta } from "trpc-to-openapi";

/** Minimal session shape the API needs — structurally compatible with Auth.js. */
export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}
export interface AppSession {
  user: SessionUser;
}

/**
 * Request context shared by all procedures. The web layer resolves the Auth.js
 * session and passes it in (keeps @closet/api free of next-auth).
 */
export async function createTRPCContext(opts: {
  headers: Headers;
  session: AppSession | null;
}) {
  return {
    headers: opts.headers,
    session: opts.session,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC
  .meta<OpenApiMeta>()
  .context<Context>()
  .create({
    transformer: superjson,
  });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Available to everyone. */
export const publicProcedure = t.procedure;

/** Requires a signed-in user; exposes `ctx.user`. */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "로그인이 필요합니다." });
  }
  return next({
    ctx: { ...ctx, session: ctx.session, user: ctx.session.user },
  });
});
