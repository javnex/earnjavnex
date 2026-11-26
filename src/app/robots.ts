import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || "https://earn.javnex.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms", "/refund", "/grievance", "/auth/login"],
        disallow: ["/admin/", "/dashboard/", "/api/"],
      },
      {
        userAgent: ["GPTBot", "CCBot", "ClaudeBot"],
        disallow: ["/admin/", "/dashboard/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
