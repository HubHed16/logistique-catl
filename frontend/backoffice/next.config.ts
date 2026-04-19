import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Requis par le Dockerfile frontend (COPY .next/standalone)
  output: "standalone",
  outputFileTracingRoot: __dirname,

  // NB : le proxy /api/tour/* et /api/wms/* est implémenté par des
  // Route Handlers catch-all sous `app/api/tour/[...path]/route.ts`
  // (idem wms). On ne peut pas utiliser `rewrites()` ici parce que
  // `next build` évalue la fonction au build time et baked l'URL
  // du fallback (localhost:8080), ce qui casse l'image Docker quand
  // les env vars TOUR_API_PROXY_TARGET sont injectées au runtime.

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
