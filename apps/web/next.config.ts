import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages (shared with future Expo app).
  transpilePackages: ["@closet/api", "@closet/db"],
  images: {
    // Cloudinary-delivered images (Next 16: use remotePatterns, not domains).
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
