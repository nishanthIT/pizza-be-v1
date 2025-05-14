-- DropForeignKey
ALTER TABLE "DefaultIngredients" DROP CONSTRAINT "DefaultIngredients_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "DefaultToppings" DROP CONSTRAINT "DefaultToppings_toppingId_fkey";

-- AddForeignKey
ALTER TABLE "DefaultToppings" ADD CONSTRAINT "DefaultToppings_toppingId_fkey" FOREIGN KEY ("toppingId") REFERENCES "ToppingsList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefaultIngredients" ADD CONSTRAINT "DefaultIngredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "IngredientsList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
