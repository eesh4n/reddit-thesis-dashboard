import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPortfolioUserId } from "@/lib/guest";

// list: "holding" | "watchlist" — one table, partitioned by this column.
function parseList(value: unknown): "holding" | "watchlist" | null {
  return value === "holding" || value === "watchlist" ? value : null;
}

// Real tickers are short and use letters/digits/dots (e.g. BRK.B). Reject
// anything else so a bad request can't stuff an arbitrarily long string into
// the DB and every card/nav element that renders it.
const TICKER_RE = /^[A-Z0-9.]{1,10}$/;

function cleanTicker(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().toUpperCase();
  return TICKER_RE.test(clean) ? clean : null;
}

export async function GET(req: Request) {
  const session = await auth();
  const userId = await getPortfolioUserId(session?.user?.id);

  const { searchParams } = new URL(req.url);
  const list = parseList(searchParams.get("list")) ?? "holding";

  const rows = await prisma.portfolio.findMany({
    where: { userId, list },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ tickers: rows.map((r) => r.ticker) });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = await getPortfolioUserId(session?.user?.id);

  const { ticker, list: rawList } = await req.json();
  const list = parseList(rawList) ?? "holding";
  const clean = cleanTicker(ticker);
  if (!clean) return NextResponse.json({ error: "Enter a valid ticker (letters, digits, up to 10 characters)." }, { status: 400 });

  const row = await prisma.portfolio.upsert({
    where: { userId_ticker_list: { userId, ticker: clean, list } },
    update: {},
    create: { userId, ticker: clean, list },
  });
  return NextResponse.json({ ticker: row.ticker });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = await getPortfolioUserId(session?.user?.id);

  const { ticker, list: rawList } = await req.json();
  const list = parseList(rawList) ?? "holding";
  const clean = cleanTicker(ticker) ?? "";

  await prisma.portfolio.deleteMany({ where: { userId, ticker: clean, list } });
  return NextResponse.json({ ok: true });
}
