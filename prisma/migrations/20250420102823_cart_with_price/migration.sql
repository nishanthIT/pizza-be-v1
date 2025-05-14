/*
  Warnings:

  - Added the required column `basePrice` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalPrice` to the `CartItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "basePrice" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "finalPrice" DECIMAL(65,30) NOT NULL;

-- CreateTable
CREATE TABLE "CartToppings" (
    "id" TEXT NOT NULL,
    "cartItemId" TEXT NOT NULL,
    "toppingId" TEXT NOT NULL,
    "defaultQuantity" INTEGER NOT NULL,
    "addedQuantity" INTEGER NOT NULL,

    CONSTRAINT "CartToppings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartIngredients" (
    "id" TEXT NOT NULL,
    "cartItemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "defaultQuantity" INTEGER NOT NULL,
    "addedQuantity" INTEGER NOT NULL,

    CONSTRAINT "CartIngredients_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CartToppings" ADD CONSTRAINT "CartToppings_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "CartItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartToppings" ADD CONSTRAINT "CartToppings_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "ToppingsList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartIngredients" ADD CONSTRAINT "CartIngredients_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "CartItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartIngredients" ADD CONSTRAINT "CartIngredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "IngredientsList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
