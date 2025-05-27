-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "isOtherItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otherItemId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "otherItemId" TEXT;

-- CreateTable
CREATE TABLE "OtherItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "OtherItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_otherItemId_fkey" FOREIGN KEY ("otherItemId") REFERENCES "OtherItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_otherItemId_fkey" FOREIGN KEY ("otherItemId") REFERENCES "OtherItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtherItem" ADD CONSTRAINT "OtherItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
