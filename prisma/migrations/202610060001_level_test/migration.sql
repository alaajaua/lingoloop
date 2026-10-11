CREATE TABLE "LevelTest" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "cards" JSONB NOT NULL, "used" INTEGER[] NOT NULL, "currentIndex" INTEGER NOT NULL,
 "estimate" DOUBLE PRECISION NOT NULL, "cursor" INTEGER NOT NULL DEFAULT 0,
 "completed" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "LevelTest_userId_completed_idx" ON "LevelTest"("userId", "completed");
CREATE UNIQUE INDEX "LevelTest_one_active" ON "LevelTest"("userId") WHERE NOT "completed";
CREATE TABLE "LevelTestAttempt" (
 "id" TEXT PRIMARY KEY, "sessionId" TEXT NOT NULL REFERENCES "LevelTest"("id") ON DELETE CASCADE,
 "position" INTEGER NOT NULL, "cardIndex" INTEGER NOT NULL, "answer" TEXT NOT NULL,
 "skipped" BOOLEAN NOT NULL, "correct" BOOLEAN NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LevelTestAttempt_sessionId_position_key" ON "LevelTestAttempt"("sessionId", "position");
