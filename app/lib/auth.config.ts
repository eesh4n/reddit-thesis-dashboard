import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Edge-safe subset of the auth config — no Prisma adapter, no bcrypt.
// Middleware runs on the Edge runtime and can't load either, so it uses
// this file (just enough to read the JWT and decide redirects). The real
// authorize() logic (with bcrypt + Prisma) lives in lib/auth.ts, which is
// only ever imported by Node-runtime API routes and server components.
export default {
  providers: [Credentials({ credentials: { email: {}, password: {} }, authorize: async () => null })],
  pages: { signIn: "/login" },
} satisfies NextAuthConfig;
