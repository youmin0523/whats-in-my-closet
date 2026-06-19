import type { MetadataRoute } from "next";

const SITE = "https://whats-in-my-closet-web.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // App pages require auth (redirect to /login) and API routes aren't content.
      disallow: ["/api/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
