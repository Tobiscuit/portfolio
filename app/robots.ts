import type { MetadataRoute } from "next";

import { absolute } from "@/lib/site";

/**
 * /robots.txt (specs/002-proprietor-adoption, A5): everything public may be
 * crawled, /media/* included (the posts' pictures). Payload's admin (/admin)
 * and the APIs (/api/: Payload's REST API and the contact form's POST) are
 * kept out. robots.txt keeps compliant crawlers out; only sign-in keeps a page
 * private, and Payload's admin has its own.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: absolute("/sitemap.xml"),
  };
}
