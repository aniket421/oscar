import type { MetadataRoute } from "next";

/** Public marketing and legal pages may be indexed; the signed-in area and auth flows may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/auth/", "/design-system"] }],
  };
}
