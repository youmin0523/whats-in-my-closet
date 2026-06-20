import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { getWeatherService } from "../services/weather";
import { constraintsSummaryKo, deriveConstraints } from "../lib/recommend";

/** Location-based forecast (geolocation consent → lat/lng → KMA grid → 동네 예보). */
export const weatherRouter = createTRPCRouter({
  forecast: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/weather/forecast",
        tags: ["weather"],
        summary: "위경도 기반 동네 예보 + 코디 제약",
        protect: false,
      },
    })
    .input(z.object({ lat: z.number(), lng: z.number() }))
    .output(
      z.object({
        forecast: z.object({
          tempMax: z.number(),
          tempMin: z.number(),
          pop: z.number(),
          pty: z.number(),
          sky: z.number(),
          nx: z.number(),
          ny: z.number(),
          source: z.enum(["kma", "fallback"]),
        }),
        constraints: z.any(),
        summary: z.string(),
        source: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const fc = await getWeatherService().forecast(input.lat, input.lng);
      const constraints = deriveConstraints(fc);
      return {
        forecast: fc,
        constraints,
        summary: constraintsSummaryKo(fc, constraints),
        source: fc.source,
      };
    }),
});
