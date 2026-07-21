import type { MetadataRoute } from "next";

// Every page here sits behind the auth/guest gate (middleware.ts) — there's
// nothing for a crawler to index, and no reason to invite one in to hammer
// API routes.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
