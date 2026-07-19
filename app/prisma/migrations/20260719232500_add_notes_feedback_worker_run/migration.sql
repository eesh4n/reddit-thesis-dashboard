-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN     "list" TEXT NOT NULL DEFAULT 'holding';
DROP INDEX "Portfolio_userId_ticker_key";
CREATE UNIQUE INDEX "Portfolio_userId_ticker_list_key" ON "Portfolio"("userId", "ticker", "list");

-- AlterTable
ALTER TABLE "RawPost" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "RawPost_score_idx" ON "RawPost"("score");

-- CreateTable
CREATE TABLE "ThesisNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThesisNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThesisFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThesisFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "postsIngested" INTEGER NOT NULL DEFAULT 0,
    "candidatesQueued" INTEGER NOT NULL DEFAULT 0,
    "thesesExtracted" INTEGER NOT NULL DEFAULT 0,
    "requestsUsed" INTEGER NOT NULL DEFAULT 0,
    "stoppedReason" TEXT,

    CONSTRAINT "WorkerRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThesisNote_userId_thesisId_key" ON "ThesisNote"("userId", "thesisId");

-- CreateIndex
CREATE UNIQUE INDEX "ThesisFeedback_userId_thesisId_key" ON "ThesisFeedback"("userId", "thesisId");

-- CreateIndex
CREATE INDEX "WorkerRun_startedAt_idx" ON "WorkerRun"("startedAt");

-- AddForeignKey
ALTER TABLE "ThesisNote" ADD CONSTRAINT "ThesisNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThesisNote" ADD CONSTRAINT "ThesisNote_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "Thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThesisFeedback" ADD CONSTRAINT "ThesisFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThesisFeedback" ADD CONSTRAINT "ThesisFeedback_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "Thesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
