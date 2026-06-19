import { cache } from "react";
import { headers } from "next/headers";
import { createCaller, createTRPCContext } from "@closet/api";
import { auth } from "./auth";

/**
 * Server-side tRPC caller for React Server Components.
 * Usage in an RSC: `const res = await api.health.ping();`
 */
const createContext = cache(async () => {
  const h = await headers();
  const session = await auth();
  return createTRPCContext({
    headers: new Headers(h),
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
});

export const api = createCaller(createContext);
