import type { MetadataRoute } from "next";

import { protectedPrefixes } from "@/features/auth/routes";

/** Public marketing and legal pages may be indexed; the signed-in area and auth flows may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...protectedPrefixes, "/app", "/auth/", "/design-system"],
      },
    ],
  };
}
