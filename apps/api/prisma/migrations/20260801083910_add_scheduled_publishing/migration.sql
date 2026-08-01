-- AlterEnum
ALTER TYPE "ContentStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "publishAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Post_status_publishAt_idx" ON "Post"("status", "publishAt");
