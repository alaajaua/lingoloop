-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('learner', 'admin');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'review', 'published', 'archived');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'learner';

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "displayWord" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "frequencyRank" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordMeaning" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "meaningKo" TEXT NOT NULL,
    "definitionEn" TEXT,
    "senseOrder" INTEGER NOT NULL,

    CONSTRAINT "WordMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Example" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "meaningId" TEXT NOT NULL,
    "sentenceEn" TEXT NOT NULL,
    "sentenceKo" TEXT NOT NULL,
    "targetForm" TEXT NOT NULL,
    "explanation" TEXT,
    "audioUrl" TEXT,
    "difficulty" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Example_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAudit" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "ContentStatus",
    "toStatus" "ContentStatus" NOT NULL,
    "revision" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Word_status_updatedAt_idx" ON "Word"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WordMeaning_wordId_senseOrder_key" ON "WordMeaning"("wordId", "senseOrder");

-- CreateIndex
CREATE INDEX "ContentAudit_wordId_createdAt_idx" ON "ContentAudit"("wordId", "createdAt");

-- AddForeignKey
ALTER TABLE "WordMeaning" ADD CONSTRAINT "WordMeaning_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Example" ADD CONSTRAINT "Example_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Example" ADD CONSTRAINT "Example_meaningId_fkey" FOREIGN KEY ("meaningId") REFERENCES "WordMeaning"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAudit" ADD CONSTRAINT "ContentAudit_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

