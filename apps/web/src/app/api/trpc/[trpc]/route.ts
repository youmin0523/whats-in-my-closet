import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@closet/api";
import { auth } from "@/server/auth";

/**
 * tRPC HTTP endpoint. Resolves the Auth.js session per request and injects it
 * into the tRPC context. Route Handlers are not cached by default in Next 16.
 */
function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
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

export { handler as GET, handler as POST };
