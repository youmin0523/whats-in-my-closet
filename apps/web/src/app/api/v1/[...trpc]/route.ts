import { createOpenApiFetchHandler } from "trpc-to-openapi";
import { appRouter, createTRPCContext } from "@closet/api";
import { auth } from "@/server/auth";

/**
 * REST/OpenAPI endpoint generated from the tRPC procedures annotated with
 * `meta.openapi`. Mounted at /api/v1 (the OpenAPI document's server base).
 * Resolves the Auth.js session per request for `protect`ed endpoints.
 */
function handler(req: Request) {
  return createOpenApiFetchHandler({
    req,
    endpoint: "/api/v1",
    router: appRouter,
    createContext: async () => {
      const session = await auth();
      return createTRPCContext({
        headers: req.headers,
        session: session?.user
          ? {
              user: {
                id: session.user.id,
                name: session.user.name ?? null,
                email: session.user.email ?? null,
                image: session.user.image ?? null,
              },
            }
          : null,
      });
    },
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
