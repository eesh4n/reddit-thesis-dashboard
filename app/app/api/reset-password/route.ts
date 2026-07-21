import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { email: rawEmail, token, password } = await req.json();
  const email = (typeof rawEmail === "string" ? rawEmail : "").toLowerCase().trim();

  if (!email || typeof token !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Password must be 8-72 characters." }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  });
  if (!record || record.expires < new Date()) {
    // Clean up an expired-but-still-present row so it can't be reused.
    if (record) await prisma.verificationToken.deleteMany({ where: { identifier: email, token } });
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
  // Single-use — burn the token so the same link can't reset the password twice.
  await prisma.verificationToken.deleteMany({ where: { identifier: email, token } });

  return NextResponse.json({ ok: true });
}
