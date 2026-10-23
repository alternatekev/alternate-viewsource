import type { NextConfig } from "next";

// Security headers from day one. A strict CSP needs per-request nonces, which would make every
// page dynamic; the static shell is worth more than that today, so CSP is a tracked follow-up.
const headers = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  // the link preview reads its frames from disk (app/opengraph-image.tsx), so they ship with it; the
  // pages that show pictures read each one's size from its header when they render (lib/content/images.ts),
  // on revalidation too, so the pictures ship with them
  outputFileTracingIncludes: { "/opengraph-image": ["./public/og/*.jpg"], "/": ["./public/writing/**/*", "./content/**/*"], "/work": ["./public/writing/**/*", "./content/**/*"], "/colophon": ["./content/**/*"], "/api/revalidate": ["./content/**/*"], "/sitemap.xml": ["./content/**/*"] },
  async headers() {
    return [
      { source: "/(.*)", headers },
      // the old posts' pictures and my portrait keep their names, so they are not immutable; a day
      // fresh, then a week served while the browser checks for a new one, saves every repeat visit a round trip each
      ...["/writing/:path*", "/hello/:path*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      })),
    ];
  },
};

export default nextConfig;
