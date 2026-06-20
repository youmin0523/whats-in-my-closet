import { buildOpenApiDocument } from "@closet/api";

// The document is static (derived from the router) → build once.
const doc = buildOpenApiDocument();

export function GET() {
  return Response.json(doc);
}
