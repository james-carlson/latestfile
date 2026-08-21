import type { MetadataRoute } from "next";
import { allRegistryEntries } from "@/lib/latestfile/registry";
import { getProfile, recentProfiles } from "@/lib/store";

export const dynamic = "force-dynamic";

const BASE = "https://latest.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/spec`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/new`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/registry`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/validate`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/feedback`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const registry: MetadataRoute.Sitemap = allRegistryEntries().map((e) => ({
    url: `${BASE}/registry/${e.namespace}/${e.entry}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Claimed namespaces are the part of the site that actually grows.
  let profiles: MetadataRoute.Sitemap = [];
  try {
    const slugs = await recentProfiles(200);
    const records = await Promise.all(slugs.map((s) => getProfile(s)));
    profiles = records
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r) => ({
        url: `${BASE}/@${r.slug}`,
        lastModified: new Date(r.updatedAt),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    // A store outage should degrade the sitemap, not break it.
  }

  return [...staticPages, ...registry, ...profiles];
}
