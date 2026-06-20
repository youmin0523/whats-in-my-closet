import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// Local dev/build: load the monorepo-root .env (where keys are kept) so the app
// runs against real keys/DB for hands-on testing. On Vercel there's no root
// .env → silent no-op and the platform-injected env is used. dotenv never
// overrides an already-set var, so deploy env always wins. SKIP_ROOT_ENV=1
// opts out (E2E runs keyless to exercise the no-key fallback paths).
if (process.env.SKIP_ROOT_ENV !== "1") {
  loadEnv({
    path: resolve(dirname(fileURLToPath(import.meta.url)), "../../.env"),
    quiet: true,
  });
}

const nextConfig: NextConfig = {
  // Transpile workspace packages (shared with future Expo app).
  transpilePackages: ["@closet/api", "@closet/db"],
  images: {
    // Cloudinary-delivered images (Next 16: use remotePatterns, not domains).
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
