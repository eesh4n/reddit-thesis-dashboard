import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth.config";

// Uses the Edge-safe config (no Prisma/bcrypt) — see lib/auth.config.ts.
const { auth } = NextAuth(authConfig);

const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

export default auth((req) => {
  const isAuthPage = AUTH_PAGES.includes(req.nextUrl.pathname);
  // A guest cookie (set by /api/guest when someone clicks "Continue as
  // guest" on the login page) counts as signed in for gating purposes —
  // middleware runs on the Edge and can't touch Prisma, so this only checks
  // the cookie is present, not that it resolves to a real row.
  const hasGuestCookie = req.cookies.has("guestId");
  const isSignedIn = !!req.auth || hasGuestCookie;

  if (!isSignedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  // A real session on /login or /signup is redirected home — no reason to
  // see the form again. A guest-only visitor stays put: guests have no way
  // to reach /login otherwise, and need it to create a real account later.
  if (!!req.auth && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|api/signup|api/guest|api/forgot-password|api/reset-password|_next/static|_next/image|favicon.ico).*)",
  ],
};
