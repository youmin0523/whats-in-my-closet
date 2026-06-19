import { createCallerFactory, createTRPCRouter } from "./trpc";
import { healthRouter } from "./routers/health";
import { systemRouter } from "./routers/system";
import { garmentsRouter } from "./routers/garments";
import { inventoryRouter } from "./routers/inventory";
import { similarityRouter } from "./routers/similarity";
import { locationsRouter } from "./routers/locations";
import { captureRouter } from "./routers/capture";
import { outfitsRouter } from "./routers/outfits";
import { weatherRouter } from "./routers/weather";
import { recommendationsRouter } from "./routers/recommendations";
import { personalColorRouter } from "./routers/personalColor";
import { tryonRouter } from "./routers/tryon";
import { billingRouter } from "./routers/billing";

/** The root tRPC router. New feature routers are mounted here. */
export const appRouter = createTRPCRouter({
  health: healthRouter,
  system: systemRouter,
  garments: garmentsRouter,
  inventory: inventoryRouter,
  similarity: similarityRouter,
  locations: locationsRouter,
  capture: captureRouter,
  outfits: outfitsRouter,
  weather: weatherRouter,
  recommendations: recommendationsRouter,
  personalColor: personalColorRouter,
  tryon: tryonRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;

/** Server-side caller factory (used by RSC and tests, no HTTP). */
export const createCaller = createCallerFactory(appRouter);
