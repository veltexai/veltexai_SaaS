import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/demo-proposal", "/resources/", "/solutions/", "/tools/"],
      disallow: ["/admin/", "/api/", "/auth/", "/dashboard/", "/view/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
