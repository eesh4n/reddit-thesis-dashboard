import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  const { email: rawEmail } = await req.json();
  const email = (typeof rawEmail === "string" ? rawEmail : "").toLowerCase().trim();

  // Always return the same success response whether or not the account
  // exists — a different response here would let anyone enumerate which
  // emails have accounts.
  const respondOk = () => NextResponse.json({ ok: true });
  if (!email) return respondOk();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return respondOk();

  const token = randomBytes(32).toString("hex");
  // Clear any previous outstanding token for this email first — otherwise
  // a stale link from an earlier request would stay valid alongside the
  // new one.
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const origin = new URL(req.url).origin;
  const resetUrl = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  try {
    await sendPasswordResetEmail(email, resetUrl);
  } catch (e) {
    console.error("Failed to send password reset email:", e);
    // Still respond ok — don't leak whether the send itself failed, and
    // don't leave the user stuck on an error for something on our end.
  }

  return respondOk();
}
