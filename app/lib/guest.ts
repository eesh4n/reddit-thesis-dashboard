import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE = "guestId";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Sign-in is currently disabled (see middleware.ts), but Holdings/Watchlist
// still need a stable identity to key Portfolio rows on. Each anonymous
// browser gets a lightweight auto-provisioned User row on first use, tied to
// a long-lived cookie — no real account, no email, no password login. Real
// sign-in still works independently; this only fills the gap while it's off.
export async function getPortfolioUserId(sessionUserId?: string | null): Promise<string> {
  if (sessionUserId) return sessionUserId;

  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: existing } });
    if (user) return user.id;
  }

  const id = randomUUID();
  await prisma.user.create({
    data: { id, email: `guest-${id}@sentimentdesk.local`, passwordHash: "" },
  });
  jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", maxAge: MAX_AGE, path: "/" });
  return id;
}
