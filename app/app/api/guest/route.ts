import { NextResponse } from "next/server";
import { getPortfolioUserId } from "@/lib/guest";

// Hit by the "Continue as guest" button on /login. Provisions (or reuses)
// the anonymous identity and sets its cookie up front, so the middleware
// sees it on the very next navigation instead of waiting for a portfolio
// write to create it lazily.
export async function POST() {
  await getPortfolioUserId(null);
  return NextResponse.json({ ok: true });
}
