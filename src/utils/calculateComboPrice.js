import { Prisma, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const calculateComboPrice = async (pizzas, discount) => {
  let totalPrice = new Prisma.Decimal(0);

  for (const pizza of pizzas) {
    if (!pizza.pizzaId) {
      throw new Error("pizzaId is missing for one of the pizzas");
    }

    const existingPizza = await prisma.pizza.findUnique({
      where: { id: pizza.pizzaId },
    });

    if (!existingPizza) {
      throw new Error(`Pizza with id ${pizza.pizzaId} does not exist`);
    }

    // Parse the sizes JSON string
    const sizes = JSON.parse(existingPizza.sizes);
    const sizePrice = sizes[pizza.size.toUpperCase()];

    if (sizePrice === undefined) {
      throw new Error(
        `Size ${pizza.size} not available for pizza ${existingPizza.name}`
      );
    }

    // Add to total price using Decimal for precision
    totalPrice = totalPrice.add(
      new Prisma.Decimal(sizePrice).times(pizza.quantity)
    );
  }

  // Calculate discount
  const discountAmount = totalPrice.times(discount).dividedBy(100);
  const finalPrice = totalPrice.minus(discountAmount);

  return finalPrice;
};
