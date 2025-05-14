/*
  Warnings:

  - Added the required column `ingredientId` to the `DefaultIngredients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toppingId` to the `DefaultToppings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DefaultIngredients" ADD COLUMN     "ingredientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DefaultToppings" ADD COLUMN     "toppingId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Pizza" ALTER COLUMN "price" SET DATA TYPE DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "DefaultToppings" ADD CONSTRAINT "DefaultToppings_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "ToppingsList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultIngredients" ADD CONSTRAINT "DefaultIngredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "IngredientsList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
