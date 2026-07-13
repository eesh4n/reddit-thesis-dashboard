import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Loose but real email shape check — not RFC 5322, just enough to reject
// garbage like "asdf" that would otherwise sit in the DB as a login the
// user can never actually be reached at or reset.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// bcrypt silently truncates input past 72 bytes — two different passwords
// sharing the same first 72 bytes would hash identically. Reject early
// instead of accepting a password that doesn't do what the user expects.
const MAX_PASSWORD_LENGTH = 72;

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  const normalizedEmail = email.toLowerCase().trim();
  if (!EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await prisma.user.create({ data: { email: normalizedEmail, passwordHash } });
  } catch (e) {
    // Two signups for the same email racing past the findUnique check above
    // both reach create(); the second hits the DB's unique constraint. Catch
    // that specific case and return the same clean 409 instead of a raw 500.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
