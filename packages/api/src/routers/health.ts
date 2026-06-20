import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

/** Liveness + echo procedures used to verify the API spine end-to-end. */
export const healthRouter = createTRPCRouter({
  ping: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/health",
        tags: ["system"],
        summary: "헬스 체크 (liveness)",
        protect: false,
      },
    })
    .input(z.void())
    .output(
      z.object({ ok: z.literal(true), service: z.string(), time: z.string() }),
    )
    .query(() => {
      return {
        ok: true as const,
        service: "closet-api",
        time: new Date().toISOString(),
      };
    }),
  echo: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/echo",
        tags: ["system"],
        summary: "에코 (입력 반사)",
        protect: false,
      },
    })
    .input(z.object({ message: z.string().min(1).max(200) }))
    .output(z.object({ echo: z.string() }))
    .query(({ input }) => {
      return { echo: input.message };
    }),
});
