import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPortfolioUserId } from "@/lib/guest";

// Thumbs up/down on an extraction — "good" vs "bad." One vote per (user,
// thesis); posting again overwrites, DELETE clears it (used when the user
// clicks the same thumb twice to un-vote). Works for guests too, same as
// /api/portfolio — sign-in is disabled by default, so requiring a real
// session here just meant every thumb click silently 401'd.
export async function POST(req: Request) {
  const session = await auth();
  const userId = await getPortfolioUserId(session?.user?.id);

  const { thesisId, vote } = await req.json();
  if (typeof thesisId !== "string" || (vote !== "good" && vote !== "bad")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await prisma.thesisFeedback.upsert({
      where: { userId_thesisId: { userId, thesisId } },
      update: { vote },
      create: { userId, thesisId, vote },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json({ error: "That thesis doesn't exist." }, { status: 400 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true, vote });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = await getPortfolioUserId(session?.user?.id);

  const { thesisId } = await req.json();
  if (typeof thesisId !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  await prisma.thesisFeedback.deleteMany({ where: { userId, thesisId } });
  return NextResponse.json({ ok: true });
}
