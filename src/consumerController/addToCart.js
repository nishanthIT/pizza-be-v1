// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// export const addToCart = async (req, res) => {
//   try {
//     const userId = req.user?.id; // You need to have auth middleware set this
//     if (!userId) {
//       return res.status(200).json({ guest: true });
//     }

//     const {
//       pizzaId,
//       size,
//       quantity,
//       eachprice,
//       price,
//       toppings,
//       ingredients,
//     } = req.body;

//     // Get or create cart
//     let cart = await prisma.cart.findFirst({ where: { userId } });
//     if (!cart) {
//       cart = await prisma.cart.create({
//         data: { userId, totalAmount: price },
//       });
//     }

//     // Create CartItem
//     const cartItem = await prisma.cartItem.create({
//       data: {
//         cartId: cart.id,
//         pizzaId,
//         size,
//         quantity,
//         basePrice: eachprice,
//         finalPrice: price,
//         cartToppings: {
//           create: toppings.map((t) => ({
//             toppingId: t.id,
//             defaultQuantity: t.defaultQuantity || 0,
//             addedQuantity: t.addedQuantity || 1,
//           })),
//         },
//         cartIngredients: {
//           create: ingredients.map((i) => ({
//             ingredientId: i.id,
//             defaultQuantity: i.defaultQuantity || 0,
//             addedQuantity: i.addedQuantity || 1,
//           })),
//         },
//       },
//     });

//     // Return updated cart in flattened form
//     const fullCart = await prisma.cart.findFirst({
//       where: { userId },
//       include: {
//         cartItems: {
//           include: {
//             pizza: true,
//             cartToppings: { include: { topping: { select: { name: true } } } },
//             cartIngredients: { include: { ingredient: { select: { name: true } } } },
//           },
//         },
//       },
//     });

//     const flattenedCart = {
//       ...fullCart,
//       cartItems: fullCart.cartItems.map((item) => ({
//         ...item,
//         cartToppings: item.cartToppings.map((t) => ({ ...t, name: t.topping.name })),
//         cartIngredients: item.cartIngredients.map((i) => ({ ...i, name: i.ingredient.name })),
//       })),
//     };

//     res.status(200).json(flattenedCart);
//   } catch (err) {
//     console.error("Add to cart failed:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

import { PrismaClient } from "@prisma/client";
import { authenticateUser } from "../middleware/authMiddleware.js";

const prisma = new PrismaClient();

function itemsMatch(a, b) {
  return (
    a.pizzaId === b.pizzaId &&
    a.size === b.size &&
    JSON.stringify(a.toppings) === JSON.stringify(b.toppings) &&
    JSON.stringify(a.ingredients) === JSON.stringify(b.ingredients)
  );
}

export default async function addToCart(req, res) {
  try {
    // Manually authenticate
    await new Promise((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const userId = req.user.id;
    const localItem = req.body; // assuming a single item is sent

    if (!localItem) {
      return res
        .status(400)
        .json({ error: "Missing cart item in request body" });
    }

    const pizzaId = localItem.pizzaId || localItem.pizza?.id || localItem.id;
    if (!pizzaId) {
      return res.status(400).json({ error: "Missing pizzaId in cart item" });
    }

    const toppings = localItem.toppings || [];
    const ingredients = localItem.ingredients || [];
    const size = localItem.size;
    const quantity = Number(localItem.quantity) || 1;
    const finalPrice =
      Number(localItem.price) || Number(localItem.finalPrice) || 0;
    const basePrice =
      Number(localItem.eachprice) || Number(localItem.basePrice) || 0;

    // Find or create cart
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          include: {
            cartToppings: true,
            cartIngredients: true,
            pizza: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // Check for matching item
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
          size,
          toppings,
          ingredients,
        }
      )
    );

    if (existing) {
      // Update quantity and price if item exists
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: { increment: quantity },
          finalPrice: existing.finalPrice + finalPrice,
        },
      });
    } else {
      // Create new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          pizzaId,
          size,
          quantity,
          basePrice,
          finalPrice,
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
      });
    }

    // Return updated cart
    const updatedCartItems = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        pizza: true,
        cartToppings: true,
        cartIngredients: true,
      },
    });

    const totalPrice = await prisma.cartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { finalPrice: true },
    });
    console.log("Total Price:", totalPrice);

    const totalQuantity = await prisma.cartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });

    return res.json({
      items: updatedCartItems,
      totalPrice: totalPrice._sum.finalPrice || 0,
      totalQuantity: totalQuantity._sum.quantity || 0,
    });
  } catch (err) {
    console.error("AddToCart error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
