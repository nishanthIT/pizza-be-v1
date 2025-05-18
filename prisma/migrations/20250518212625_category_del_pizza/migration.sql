-- DropForeignKey
ALTER TABLE "Pizza" DROP CONSTRAINT "Pizza_categoryId_fkey";

-- AddForeignKey
ALTER TABLE "Pizza" ADD CONSTRAINT "Pizza_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
