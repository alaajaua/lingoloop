CREATE TABLE "LearningSession" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "queue" INTEGER[] NOT NULL, "cursor" INTEGER NOT NULL DEFAULT 0,
 "hinted" BOOLEAN NOT NULL DEFAULT false, "completed" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "LearningSession_userId_completed_idx" ON "LearningSession"("userId", "completed");
CREATE UNIQUE INDEX "LearningSession_one_active" ON "LearningSession"("userId") WHERE NOT "completed";
CREATE TABLE "LearningAttempt" (
 "id" TEXT PRIMARY KEY, "sessionId" TEXT NOT NULL REFERENCES "LearningSession"("id") ON DELETE CASCADE,
 "position" INTEGER NOT NULL, "wordIndex" INTEGER NOT NULL, "answer" TEXT NOT NULL,
 "skipped" BOOLEAN NOT NULL, "hintUsed" BOOLEAN NOT NULL, "correct" BOOLEAN NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LearningAttempt_sessionId_position_key" ON "LearningAttempt"("sessionId", "position");
