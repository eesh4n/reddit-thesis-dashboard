import { prisma } from "@/lib/db";

export async function getAllTheses() {

    return prisma.thesis.findMany({

        orderBy: { extractedAt: "desc"}, // sort by extractedAt timestamp, desc returns newest (descending)
        include: { rawPost: { select: {permalink: true }}}, // include pulls in a related table (Thesis -> rawPost), and from that selected post grab only the permalink field (not the whole post)


    })

};

// All theses for one ticker, newest first — used by the ticker detail page.
export async function getThesesForTicker(ticker: string) {
    return prisma.thesis.findMany({
        where: { ticker: ticker.toUpperCase() },
        orderBy: { extractedAt: "desc" },
        include: { rawPost: { select: { permalink: true, subreddit: true, author: true } } },
    });
}