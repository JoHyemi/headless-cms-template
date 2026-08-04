-- CreateTable
CREATE TABLE "_CategoryToPostTypeEntry" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToPostTypeEntry_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CategoryToPostTypeEntry_B_index" ON "_CategoryToPostTypeEntry"("B");

-- AddForeignKey
ALTER TABLE "_CategoryToPostTypeEntry" ADD CONSTRAINT "_CategoryToPostTypeEntry_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToPostTypeEntry" ADD CONSTRAINT "_CategoryToPostTypeEntry_B_fkey" FOREIGN KEY ("B") REFERENCES "PostTypeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
