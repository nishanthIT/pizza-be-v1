-- DropForeignKey
ALTER TABLE "DefaultIngredients" DROP CONSTRAINT "DefaultIngredients_pizzaId_fkey";

-- DropForeignKey
ALTER TABLE "DefaultToppings" DROP CONSTRAINT "DefaultToppings_pizzaId_fkey";

-- AddForeignKey
ALTER TABLE "DefaultToppings" ADD CONSTRAINT "DefaultToppings_pizzaId_fkey" FOREIGN KEY ("pizzaId") REFERENCES "Pizza"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultIngredients" ADD CONSTRAINT "DefaultIngredients_pizzaId_fkey" FOREIGN KEY ("pizzaId") REFERENCES "Pizza"("id") ON DELETE CASCADE ON UPDATE CASCADE;
