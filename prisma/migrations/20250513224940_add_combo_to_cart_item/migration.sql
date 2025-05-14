-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "comboId" TEXT,
ALTER COLUMN "pizzaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "ComboOffers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
