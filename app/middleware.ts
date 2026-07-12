import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/lib/auth.config";

// Uses the Edge-safe config (no Prisma/bcrypt) — see lib/auth.config.ts.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuthPage = req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup";
  const isSignedIn = !!req.auth;

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
  matcher: ["/((?!api/auth|api/signup|_next/static|_next/image|favicon.ico).*)"],
};
