import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth.config";

// Uses the Edge-safe config (no Prisma/bcrypt) — see lib/auth.config.ts.
const { auth } = NextAuth(authConfig);

// Sign-in gate is disabled for now — every page is publicly viewable.
// Re-enable by restoring the redirect-to-/login block below.
export default auth((req) => {
  const isAuthPage = req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup";
  const isSignedIn = !!req.auth;

  if (isSignedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api/auth|api/signup|_next/static|_next/image|favicon.ico).*)"],
};
