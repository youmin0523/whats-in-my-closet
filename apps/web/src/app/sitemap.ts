import type { MetadataRoute } from "next";

const SITE = "https://whats-in-my-closet-web.vercel.app";

/** Only public pages are indexable — the app (closet/inventory/…) requires auth. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/login`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
