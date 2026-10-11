-- CreateTable
CREATE TABLE "ContentImport" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentImport_actorId_requestId_key" ON "ContentImport"("actorId", "requestId");

