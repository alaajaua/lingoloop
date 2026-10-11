ALTER TABLE "LearningSession" ADD COLUMN "cards" JSONB, ADD COLUMN "source" TEXT NOT NULL DEFAULT 'sample';
CREATE TABLE "WordReview" (
 "id" TEXT PRIMARY KEY,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "wordId" TEXT NOT NULL REFERENCES "Word"("id") ON DELETE CASCADE,
 "stage" INTEGER NOT NULL DEFAULT 0,
 "nextReviewAt" TIMESTAMP(3) NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "WordReview_userId_wordId_key" ON "WordReview"("userId", "wordId");
CREATE INDEX "WordReview_userId_nextReviewAt_idx" ON "WordReview"("userId", "nextReviewAt");
