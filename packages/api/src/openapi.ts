import { generateOpenApiDocument } from "trpc-to-openapi";
import { appRouter } from "./root";

const LOCAL = "http://localhost:3000/api/v1";
const DEPLOYED = "https://whats-in-my-closet-web.vercel.app/api/v1";

/**
 * OpenAPI 3 document generated from the tRPC procedures annotated with
 * `meta.openapi`. Both the local and deployed servers are listed so Swagger UI
 * can target either. (Only a curated, REST-friendly subset is exposed.)
 */
export function buildOpenApiDocument() {
  const doc = generateOpenApiDocument(appRouter, {
    title: "옷장 지킴이 API",
    version: "1.0.0",
    description:
      "What's in my closet — AI 옷장 관리 REST API. tRPC 라우터에서 자동 생성됩니다. 'protect' 표시가 있는 엔드포인트는 로그인(세션 쿠키)이 필요해요.",
    baseUrl: LOCAL,
    tags: ["system", "weather", "garments"],
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "authjs.session-token",
        description: "Auth.js 세션 쿠키 — 같은 브라우저에서 로그인하면 자동 전송돼요.",
      },
    },
  });
  doc.servers = [
    { url: LOCAL, description: "로컬 (pnpm dev)" },
    { url: DEPLOYED, description: "배포 (Vercel)" },
  ];
  return doc;
}
