import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { getWeatherService } from "../services/weather";
import { constraintsSummaryKo, deriveConstraints } from "../lib/recommend";

/** Location-based forecast (geolocation consent → lat/lng → KMA grid → 동네 예보). */
export const weatherRouter = createTRPCRouter({
  forecast: publicProcedure
    .input(z.object({ lat: z.number(), lng: z.number() }))
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
