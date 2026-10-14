import type { MetadataRoute } from "next";
import { getChapters, publishable } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const chapters = await getChapters();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    ...chapters.filter(publishable).map((c) => ({ url: `${SITE_URL}/${c.phase}/${c.slug}`, changeFrequency: "monthly" as const })),
  ];
}
