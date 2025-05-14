-- DropForeignKey
ALTER TABLE "ComboPizza" DROP CONSTRAINT "ComboPizza_comboId_fkey";

-- DropForeignKey
ALTER TABLE "ComboPizza" DROP CONSTRAINT "ComboPizza_pizzaId_fkey";

-- AddForeignKey
ALTER TABLE "ComboPizza" ADD CONSTRAINT "ComboPizza_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "ComboOffers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboPizza" ADD CONSTRAINT "ComboPizza_pizzaId_fkey" FOREIGN KEY ("pizzaId") REFERENCES "Pizza"("id") ON DELETE CASCADE ON UPDATE CASCADE;
