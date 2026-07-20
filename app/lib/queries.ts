import { prisma } from "@/lib/db";

// Bounded to the last N days: the dashboard only needs recent activity for
// holdings/trending, and this table grows daily with the scraper — an
// unbounded findMany() here would get slower every single day forever.
export async function getAllTheses(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return prisma.thesis.findMany({
        where: { extractedAt: { gte: since } },
        orderBy: { extractedAt: "desc"}, // sort by extractedAt timestamp, desc returns newest (descending)
        include: { rawPost: { select: {permalink: true, postedAt: true, author: true }}}, // include pulls in a related table (Thesis -> rawPost); postedAt is when the Reddit post itself went up, not when we scraped it; author feeds duplicate-author consensus dedup


    })

};

// Highest-confidence theses — the "start your morning here" list. Prefers
// the last 24h; if the scraper had a quiet day (or the extraction quota
// stalled), widens to 72h instead of showing nothing. Returns the window it
// used so the UI can label itself honestly.
export async function getTopConvictionToday(limit = 6, minConfidence = 0.85) {
    for (const hours of [24, 72]) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);
        const rows = await prisma.thesis.findMany({
            where: { extractedAt: { gte: since }, confidence: { gte: minConfidence } },
            orderBy: [{ confidence: "desc" }, { extractedAt: "desc" }],
            take: limit,
            include: { rawPost: { select: { permalink: true, subreddit: true, postedAt: true } } },
        });
        if (rows.length > 0) return { rows, windowHours: hours };
    }
    return { rows: [], windowHours: 24 };
}

// All theses for one ticker, newest first — used by the ticker detail page.
// "Newest" is by the Reddit post's own postedAt, not extractedAt: batched,
// priority-ordered extraction can analyze a days-old post today, so sorting
// by scrape time instead of post time made the displayed dates (which show
// postedAt) look out of order.
export async function getThesesForTicker(ticker: string) {
    return prisma.thesis.findMany({
        where: { ticker: ticker.toUpperCase() },
        orderBy: { rawPost: { postedAt: "desc" } },
        include: { rawPost: { select: { permalink: true, subreddit: true, author: true, postedAt: true } } },
    });
}

// How many scraped posts are still waiting on the worker's extraction pass —
// mirrors the worker's own get_unextracted_posts() JOIN. The free-tier Gemini
// quota means this rarely hits zero; surfacing the number keeps that honest
// instead of the dashboard silently looking "caught up" when it isn't.
export async function getBacklogCount(): Promise<number> {
    return prisma.rawPost.count({
        where: { theses: { none: {} }, failures: { none: {} } },
    });
}

// This user's own notes on a set of theses, keyed by thesisId — used to
// pre-populate the note editor on the ticker detail page.
export async function getUserNotes(userId: string, thesisIds: string[]): Promise<Record<string, string>> {
    if (thesisIds.length === 0) return {};
    const rows = await prisma.thesisNote.findMany({
        where: { userId, thesisId: { in: thesisIds } },
    });
    return Object.fromEntries(rows.map((r) => [r.thesisId, r.note]));
}

// This user's own thumbs up/down on a set of theses, keyed by thesisId —
// used to pre-populate the feedback buttons.
export async function getUserFeedback(userId: string, thesisIds: string[]): Promise<Record<string, "good" | "bad">> {
    if (thesisIds.length === 0) return {};
    const rows = await prisma.thesisFeedback.findMany({
        where: { userId, thesisId: { in: thesisIds } },
    });
    return Object.fromEntries(rows.map((r) => [r.thesisId, r.vote as "good" | "bad"]));
}

// Most recent worker runs, newest first — the quota dashboard's run history.
export async function getRecentWorkerRuns(limit = 14) {
    return prisma.workerRun.findMany({
        orderBy: { startedAt: "desc" },
        take: limit,
    });
}

// Sum of today's runs (there can be more than one if the task fires more
// than once, e.g. a missed-then-caught-up run). "Requests used" is the
// number that actually matters — that's what the free tier gates, not
// theses count or tokens.
export async function getTodayRunStats() {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const runs = await prisma.workerRun.findMany({ where: { startedAt: { gte: since } } });
    return {
        requestsUsed: runs.reduce((sum, r) => sum + r.requestsUsed, 0),
        thesesExtracted: runs.reduce((sum, r) => sum + r.thesesExtracted, 0),
        postsIngested: runs.reduce((sum, r) => sum + r.postsIngested, 0),
        runsCount: runs.length,
    };
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