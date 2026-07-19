import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_NOTE_LENGTH = 500;

// One note per (user, thesis) — a private journal entry, not shared with
// anyone else who might eventually use this dashboard.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { thesisId, note } = await req.json();
  if (typeof thesisId !== "string" || typeof note !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const trimmed = note.trim();

  // Empty note means "clear it" rather than storing a blank row.
  if (!trimmed) {
    await prisma.thesisNote.deleteMany({ where: { userId: session.user.id, thesisId } });
    return NextResponse.json({ ok: true });
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.` }, { status: 400 });
  }

  try {
    await prisma.thesisNote.upsert({
      where: { userId_thesisId: { userId: session.user.id, thesisId } },
      update: { note: trimmed },
      create: { userId: session.user.id, thesisId, note: trimmed },
    });
  } catch (e) {
    // thesisId doesn't reference a real Thesis row — the FK constraint trips.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json({ error: "That thesis doesn't exist." }, { status: 400 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true, note: trimmed });
}
