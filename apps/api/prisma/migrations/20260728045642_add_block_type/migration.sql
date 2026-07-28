-- CreateTable
CREATE TABLE "BlockType" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockType_slug_key" ON "BlockType"("slug");

-- CreateIndex
CREATE INDEX "BlockType_siteId_idx" ON "BlockType"("siteId");

-- AddForeignKey
ALTER TABLE "BlockType" ADD CONSTRAINT "BlockType_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
