import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

/** Liveness + echo procedures used to verify the API spine end-to-end. */
export const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(() => {
    return {
      ok: true as const,
      service: "closet-api",
      time: new Date().toISOString(),
    };
  }),
  echo: publicProcedure
    .input(z.object({ message: z.string().min(1).max(200) }))
    .query(({ input }) => {
      return { echo: input.message };
    }),
});
