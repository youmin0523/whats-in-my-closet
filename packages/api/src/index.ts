// @closet/api — tRPC root router + context (shared by web and future mobile).
export { appRouter, createCaller, type AppRouter } from "./root";
export { createTRPCContext, type Context } from "./trpc";
export { buildOpenApiDocument } from "./openapi";
