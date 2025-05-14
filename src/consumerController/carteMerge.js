import { PrismaClient } from "@prisma/client";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { updateCartTotal } from "../services/cartService.js";

const prisma = new PrismaClient();

// Helper to normalize arrays for comparison
function normalize(arr) {
  return [...arr].sort((a, b) => a.id - b.id);
}

// Check if two arrays of {id, quantity} match
function arraysMatch(arr1, arr2) {
  const norm1 = normalize(arr1);
  const norm2 = normalize(arr2);
  if (norm1.length !== norm2.length) return false;
  return norm1.every(
    (item, i) => item.id === norm2[i].id && item.quantity === norm2[i].quantity
  );
}

// Check if two cart items match
function itemsMatch(a, b) {
  if (b.isCombo) {
    return a.comboId === b.id;
  }
  return (
    a.pizzaId === b.pizzaId &&
    a.size === b.size &&
    arraysMatch(a.toppings, b.toppings) &&
    arraysMatch(a.ingredients, b.ingredients)
  );
}

export default async function syncCart(req, res) {
  console.log("Sync Cart hit");

  try {
    // Authenticate user manually
    await new Promise((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const userId = req.user.id;
    const localItems = req.body.cartItems || [];

    console.log("Received localItems:", localItems);
    console.log("User ID:", userId);

    // Find or create cart
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          include: {
            cartToppings: true,
            cartIngredients: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });

      // Re-fetch cart to include cartItems
      cart = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: {
          cartItems: {
            include: {
              cartToppings: true,
              cartIngredients: true,
            },
          },
        },
      });
    }

    const updatedItems = [...(cart.cartItems || [])];

    for (const localItem of localItems) {
      const pizzaId = localItem.pizzaId || localItem.pizza?.id || localItem.id;
      if (!pizzaId) {
        console.warn("Skipping item with missing pizzaId:", localItem);
        continue;
      }

      const toppings =
        localItem.toppings ||
        localItem.cartToppings?.map((t) => ({
          id: t.toppingId,
          quantity: t.addedQuantity,
        })) ||
        [];

      const ingredients =
        localItem.ingredients ||
        localItem.cartIngredients?.map((i) => ({
          id: i.ingredientId,
          quantity: i.addedQuantity,
        })) ||
        [];

      const existing = cart.cartItems.find((item) =>
        itemsMatch(
          {
            pizzaId: item.pizzaId,
            size: item.size,
            toppings: item.cartToppings.map((t) => ({
              id: t.toppingId,
              quantity: t.addedQuantity,
            })),
            ingredients: item.cartIngredients.map((i) => ({
              id: i.ingredientId,
              quantity: i.addedQuantity,
            })),
          },
          {
            pizzaId,
            size: localItem.size,
            toppings,
            ingredients,
          }
        )
      );

      const finalPrice =
        Number(localItem.price) || Number(localItem.finalPrice) || 0;
      const eachPrice =
        Number(localItem.eachprice) || Number(localItem.basePrice) || 0;

      if (existing) {
        const updatedItem = await prisma.cartItem.update({
          where: { id: existing.id },
          data: {
            quantity: { increment: localItem.quantity },
            finalPrice: Number(existing.finalPrice) + Number(finalPrice), // <--- this line
          },
        });

        // Replace the item in the updatedItems array
        const index = updatedItems.findIndex((i) => i.id === existing.id);
        if (index !== -1) updatedItems[index] = updatedItem;
      } else {
        if (localItem.isCombo) {
          const newItem = await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              comboId: localItem.id,
              pizzaId: null,
              size: "COMBO",
              quantity: localItem.quantity,
              basePrice: Number(localItem.eachprice),
              // Fix: Multiply finalPrice by quantity for combos
              finalPrice: Number(localItem.eachprice) * localItem.quantity,
              isCombo: true,
            },
          });
          updatedItems.push(newItem);
        } else {
          const newItem = await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              pizzaId: pizzaId,
              comboId: null, // Set comboId to null for regular pizzas
              size: localItem.size,
              quantity: localItem.quantity,
              basePrice: eachPrice,
              finalPrice: finalPrice,
              cartToppings: {
                create: toppings.map((t) => ({
                  toppingId: t.id,
                  defaultQuantity: 0,
                  addedQuantity: t.quantity,
                })),
              },
              cartIngredients: {
                create: ingredients.map((i) => ({
                  ingredientId: i.id,
                  defaultQuantity: 0,
                  addedQuantity: i.quantity,
                })),
              },
            },
            include: {
              cartToppings: true,
              cartIngredients: true,
            },
          });
          updatedItems.push(newItem);
        }
      }
    }

    // Add these debug logs after processing items
    console.log(
      "Cart Items after processing:",
      await prisma.cartItem.findMany({
        where: { cartId: cart.id },
        select: { finalPrice: true, quantity: true },
      })
    );

    const totalPrice = await prisma.cartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { finalPrice: true },
    });
    console.log("Aggregated Total:", totalPrice._sum.finalPrice);

    console.log("Total Price from DB:", totalPrice);

    // Update the cart's totalAmount with null check
    const updatedCart = await prisma.cart.update({
      where: { id: cart.id },
      data: {
        totalAmount: totalPrice._sum.finalPrice || 0,
        createdAt: new Date(),
      },
    });

    console.log("Updated Cart Total:", updatedCart.totalAmount);

    const totalQuantity = await prisma.cartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });

    // Remove this line since we already updated the cart total above
    await updateCartTotal(cart.id);

    res.json({
      items: updatedItems,
      totalQuantity: totalQuantity._sum.quantity || 0,
      totalPrice: totalPrice._sum.finalPrice || 0,
    });
  } catch (err) {
    console.error("Error in syncCart:", err);
    res.status(500).json({ error: "Internal server error during cart sync." });
  }
}
