-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubredditSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubredditSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawPost" (
    "id" TEXT NOT NULL,
    "redditId" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thesis" (
    "id" TEXT NOT NULL,
    "rawPostId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Thesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedExtraction" (
    "id" TEXT NOT NULL,
    "rawPostId" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_ticker_key" ON "Portfolio"("userId", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "SubredditSource_name_key" ON "SubredditSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RawPost_redditId_key" ON "RawPost"("redditId");

-- CreateIndex
CREATE INDEX "Thesis_ticker_extractedAt_idx" ON "Thesis"("ticker", "extractedAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thesis" ADD CONSTRAINT "Thesis_rawPostId_fkey" FOREIGN KEY ("rawPostId") REFERENCES "RawPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailedExtraction" ADD CONSTRAINT "FailedExtraction_rawPostId_fkey" FOREIGN KEY ("rawPostId") REFERENCES "RawPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
