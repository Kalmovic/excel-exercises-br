import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Site em teste: fora do Google até INDEXAR_SITE=1 (vale também para JSON, imagens e PDFs).
  async headers() {
    if (process.env.INDEXAR_SITE === "1") return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
