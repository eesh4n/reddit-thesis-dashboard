import { prisma } from "@/lib/db";

export async function getAllTheses() {

    return prisma.thesis.findMany({

        orderBy: { extractedAt: "desc"}, // sort by extractedAt timestamp, desc returns newest (descending)
        include: { rawPost: { select: {permalink: true, postedAt: true }}}, // include pulls in a related table (Thesis -> rawPost); postedAt is when the Reddit post itself went up, not when we scraped it


    })

};

// All theses for one ticker, newest first — used by the ticker detail page.
export async function getThesesForTicker(ticker: string) {
    return prisma.thesis.findMany({
        where: { ticker: ticker.toUpperCase() },
        orderBy: { extractedAt: "desc" },
        include: { rawPost: { select: { permalink: true, subreddit: true, author: true, postedAt: true } } },
    });
}

// Daily bull/bear/neutral counts for one ticker over the last N days —
// feeds the sentiment trend sparkline on the ticker detail page.
export async function getDailySentiment(ticker: string, days = 14) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await prisma.thesis.findMany({
        where: { ticker: ticker.toUpperCase(), extractedAt: { gte: since } },
        select: { sentiment: true, extractedAt: true },
        orderBy: { extractedAt: "asc" },
    });

    const byDay = new Map<string, { bull: number; bear: number; neutral: number }>();
    for (const r of rows) {
        const day = r.extractedAt.toISOString().slice(0, 10); // YYYY-MM-DD
        const entry = byDay.get(day) ?? { bull: 0, bear: 0, neutral: 0 };
        if (r.sentiment === "bullish") entry.bull++;
        else if (r.sentiment === "bearish") entry.bear++;
        else entry.neutral++;
        byDay.set(day, entry);
    }

    // Fill every day in the window, even ones with zero theses, so the
    // sparkline has a consistent x-axis instead of skipping quiet days.
    const points: { date: string; net: number; total: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const entry = byDay.get(d) ?? { bull: 0, bear: 0, neutral: 0 };
        points.push({ date: d, net: entry.bull - entry.bear, total: entry.bull + entry.bear + entry.neutral });
    }
    return points;
}