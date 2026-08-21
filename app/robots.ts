import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The inbox is key-gated, but there is no reason to invite crawling it,
        // and API routes are not useful in an index.
        disallow: ["/feedback/inbox", "/api/"],
      },
    ],
    sitemap: "https://latest.dev/sitemap.xml",
    host: "https://latest.dev",
  };
}
