import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Chapter pages return when there are told chapters to show.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 }];
}
