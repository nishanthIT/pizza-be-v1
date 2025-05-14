import { PrismaClient } from "@prisma/client";
import { authenticateUser } from "../middleware/authMiddleware.js"; // Adjust path as needed

const prisma = new PrismaClient();

export default async function clearCart(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Authenticate user
    await new Promise((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const userId = req.user.id;

    // Find the user's cart
    const cart = await prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      return res.status(200).json({ error: "Cart not found for  new users" });
    }

    const cartId = cart.id;

    // First, get all cart item IDs (for deleting toppings & ingredients)
    const cartItems = await prisma.cartItem.findMany({
      where: { cartId },
      select: { id: true },
    });

    const cartItemIds = cartItems.map((item) => item.id);

    // Delete related cart toppings
    await prisma.cartToppings.deleteMany({
      where: {
        cartItemId: { in: cartItemIds },
      },
    });

    // Delete related cart ingredients
    await prisma.cartIngredients.deleteMany({
      where: {
        cartItemId: { in: cartItemIds },
      },
    });

    // Delete all cart items
    await prisma.cartItem.deleteMany({
      where: { cartId },
    });

    // (Optional) Reset cart totalAmount if needed
    await prisma.cart.update({
      where: { id: cartId },
      data: { totalAmount: 0 },
    });

    res
      .status(200)
      .json({ success: true, message: "Cart cleared successfully" });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res
      .status(500)
      .json({ error: "Internal server error while clearing cart." });
  }
}
