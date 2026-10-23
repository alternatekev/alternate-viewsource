import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Chapter pages return when there are told chapters to show.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/work`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/colophon`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
