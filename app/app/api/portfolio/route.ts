import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// list: "holding" | "watchlist" — one table, partitioned by this column.
function parseList(value: unknown): "holding" | "watchlist" | null {
  return value === "holding" || value === "watchlist" ? value : null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const list = parseList(searchParams.get("list")) ?? "holding";

  const rows = await prisma.portfolio.findMany({
    where: { userId: session.user.id, list },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ tickers: rows.map((r) => r.ticker) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { ticker, list: rawList } = await req.json();
  const list = parseList(rawList) ?? "holding";
  const clean = typeof ticker === "string" ? ticker.trim().toUpperCase() : "";
  if (!clean) return NextResponse.json({ error: "Ticker is required." }, { status: 400 });

  const row = await prisma.portfolio.upsert({
    where: { userId_ticker_list: { userId: session.user.id, ticker: clean, list } },
    update: {},
    create: { userId: session.user.id, ticker: clean, list },
  });
  return NextResponse.json({ ticker: row.ticker });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { ticker, list: rawList } = await req.json();
  const list = parseList(rawList) ?? "holding";
  const clean = typeof ticker === "string" ? ticker.trim().toUpperCase() : "";

  await prisma.portfolio.deleteMany({ where: { userId: session.user.id, ticker: clean, list } });
  return NextResponse.json({ ok: true });
}
