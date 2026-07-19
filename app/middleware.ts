import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth.config";

// Uses the Edge-safe config (no Prisma/bcrypt) — see lib/auth.config.ts.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuthPage = req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup";
  // A guest cookie (set by /api/guest when someone clicks "Continue as
  // guest" on the login page) counts as signed in for gating purposes —
  // middleware runs on the Edge and can't touch Prisma, so this only checks
  // the cookie is present, not that it resolves to a real row.
  const isSignedIn = !!req.auth || req.cookies.has("guestId");

  if (!isSignedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (isSignedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api/auth|api/signup|api/guest|_next/static|_next/image|favicon.ico).*)"],
};
