import type { MetadataRoute } from "next";
import { RESOURCE_SLUGS } from "@/features/resources/content";
import { SITE_URL } from "@/lib/site";
import { SOLUTION_SLUGS } from "@/features/solutions/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/demo-proposal", priority: 0.85, changeFrequency: "monthly" as const },
    { path: "/tools/cleaning-bid-calculator", priority: 0.95, changeFrequency: "monthly" as const },
    { path: "/resources", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/resources/commercial-cleaning-benchmark-report", priority: 0.95, changeFrequency: "monthly" as const },
    { path: "/solutions", priority: 0.85, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
  ];

  return [
    ...routes.map(({ path, ...entry }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      ...entry,
    })),
    ...RESOURCE_SLUGS.map((slug) => ({
      url: `${SITE_URL}/resources/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...SOLUTION_SLUGS.map((slug) => ({
      url: `${SITE_URL}/solutions/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
