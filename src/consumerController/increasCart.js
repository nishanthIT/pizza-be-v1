import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/authMiddleware.js';

const prisma = new PrismaClient();

// Utility to compare toppings/ingredients arrays
function arraysMatch(dbItems, clientItems) {
  const dbIds = dbItems.map(i => i.toppingId || i.ingredientId).sort();
  const clientIds = clientItems.map(i => i.id).sort();
  return JSON.stringify(dbIds) === JSON.stringify(clientIds);
}

export default async function increment(req, res) {
    console.log("Incrementing cart item...");
  try {
    await new Promise((resolve, reject) =>
      authenticateUser(req, res, (err) => (err ? reject(err) : resolve()))
    );

    const { userId, item } = req.body;

    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          include: { cartToppings: true, cartIngredients: true },
        },
      },
    });



  console.log("Received item:", item);

cart.cartItems.forEach((dbItem, idx) => {
  console.log(`\n-- Comparing DB Item #${idx} --`);
  console.log("DB pizzaId:", dbItem.pizzaId, "Client:", item.id);
  console.log("DB size:", dbItem.size, "Client:", item.size);
  console.log("DB toppings:", dbItem.cartToppings.map(t => t.toppingId));
  console.log("Client toppings:", item.toppings.map(t => t.id));
  console.log("DB ingredients:", dbItem.cartIngredients.map(i => i.ingredientId));
  console.log("Client ingredients:", item.ingredients.map(i => i.id));
});


    const match = cart.cartItems.find((dbItem) =>
      dbItem.pizzaId === item.id &&
      dbItem.size === item.size &&
      arraysMatch(dbItem.cartToppings, item.toppings) &&
      arraysMatch(dbItem.cartIngredients, item.ingredients)
    );
     console.log("Match found:", match);
    if (!match) return res.status(404).json({ error: "Item not found" });

    await prisma.cartItem.update({
      where: { id: match.id },
      data: {
        quantity: { increment: 1 },
        finalPrice: { increment: item.eachprice },
      },
    });

    res.json({ message: "Incremented" });
  } catch (err) {
    console.error("Increment error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
