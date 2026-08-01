-- CreateTable
CREATE TABLE "PostType" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTypeEntry" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "postTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fieldValues" JSONB NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostTypeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostType_slug_key" ON "PostType"("slug");

-- CreateIndex
CREATE INDEX "PostType_siteId_idx" ON "PostType"("siteId");

-- CreateIndex
CREATE INDEX "PostTypeEntry_postTypeId_status_createdAt_idx" ON "PostTypeEntry"("postTypeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PostTypeEntry_status_publishAt_idx" ON "PostTypeEntry"("status", "publishAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostTypeEntry_postTypeId_slug_key" ON "PostTypeEntry"("postTypeId", "slug");

-- AddForeignKey
ALTER TABLE "PostType" ADD CONSTRAINT "PostType_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTypeEntry" ADD CONSTRAINT "PostTypeEntry_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTypeEntry" ADD CONSTRAINT "PostTypeEntry_postTypeId_fkey" FOREIGN KEY ("postTypeId") REFERENCES "PostType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
