import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Add item to cart - supports both guest users (with sessionId) and logged in users (with userId)
 */
const addItemToCart = async (req, res) => {
  try {
    // Get identifiers from request (userId comes from auth middleware)
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: "Authentication required" });
    }

    const {
      pizzaId,
      size,
      quantity = 1,
      selectedToppings = [],
      selectedIngredients = [],
    } = req.body;

    // Validate inputs
    if (!pizzaId || !size) {
      return res.status(400).json({ error: "Pizza ID and size are required" });
    }

    // Get pizza with related data
    const pizza = await prisma.pizza.findUnique({
      where: { id: pizzaId },
      include: {
        defaultToppings: { include: { topping: true } },
        defaultIngredients: { include: { ingredient: true } },
      },
    });

    if (!pizza) {
      return res.status(404).json({ error: "Pizza not found" });
    }

    // Parse size prices
    let sizePrices;
    try {
      sizePrices = JSON.parse(pizza.sizes);
    } catch (e) {
      return res.status(500).json({ error: "Invalid pizza size data" });
    }

    if (!sizePrices[size]) {
      return res.status(400).json({ error: "Invalid size selection" });
    }

    const basePrice = sizePrices[size];
    let priceAdjustment = 0;

    // Process toppings
    const [toppingsToCreate, ingredientsToCreate] = await Promise.all([
      processCustomizations(
        selectedToppings,
        pizza.defaultToppings,
        "topping",
        prisma.toppingsList
      ),
      processCustomizations(
        selectedIngredients,
        pizza.defaultIngredients,
        "ingredient",
        prisma.ingredientsList
      ),
    ]);

    // Calculate final price
    let finalPrice = basePrice * quantity + priceAdjustment;
    finalPrice = Math.max(finalPrice, basePrice * quantity);

    // Get or create cart
    let cart = await prisma.cart.upsert({
      where: userId ? { userId } : { sessionId },
      update: {},
      create: {
        userId: userId || null,
        sessionId: !userId ? sessionId : null,
        totalAmount: 0,
      },
      include: { cartItems: true },
    });

    // Create cart item
    const cartItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        pizzaId,
        size,
        quantity,
        basePrice,
        finalPrice,
        cartToppings: { create: toppingsToCreate },
        cartIngredients: { create: ingredientsToCreate },
      },
      include: {
        pizza: { select: { name: true, imageUrl: true } },
        cartToppings: { include: { topping: true } },
        cartIngredients: { include: { ingredient: true } },
      },
    });

    // Update cart total
    await updateCartTotal(cart.id);

    return res.status(201).json({
      success: true,
      message: "Item added to cart",
      cartItem: formatCartItem(cartItem),
      cartTotal: await getCartTotal(cart.id),
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Remove item from cart
 */
const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    if (!itemId) {
      return res.status(400).json({ error: "Item ID required" });
    }

    // Verify item belongs to user's cart
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (
      (userId && cartItem.cart.userId !== userId) ||
      (!userId && cartItem.cart.sessionId !== sessionId)
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete the item
    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    // Update cart total
    await updateCartTotal(cartItem.cartId);

    return res.status(200).json({
      success: true,
      message: "Item removed from cart",
      cartTotal: await getCartTotal(cartItem.cartId),
    });
  } catch (error) {
    console.error("Remove cart item error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Clear cart - remove all items
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({ error: "Authentication required" });
    }

    // Find and clear the cart
    const cart = await prisma.cart.findFirst({
      where: userId ? { userId } : { sessionId },
    });

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    await prisma.cart.update({
      where: { id: cart.id },
      data: { totalAmount: 0 },
    });

    return res.status(200).json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Merge guest cart with user cart after login
 */
const mergeCartsAfterLogin = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    if (!userId) {
      return res.status(400).json({ error: "User authentication required" });
    }

    if (!sessionId) {
      return res.status(400).json({ error: "Session information missing" });
    }

    // Find session cart
    const sessionCart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        cartItems: {
          include: {
            cartToppings: true,
            cartIngredients: true,
          },
        },
      },
    });

    // If no session cart or empty, just return success
    if (!sessionCart || sessionCart.cartItems.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No session cart found or cart is empty",
        merged: false,
      });
    }

    // Find or create user cart
    let userCart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId, totalAmount: 0 },
    });

    // Move items to user cart
    await Promise.all(
      sessionCart.cartItems.map((item) =>
        prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            pizzaId: item.pizzaId,
            size: item.size,
            quantity: item.quantity,
            basePrice: item.basePrice,
            finalPrice: item.finalPrice,
            cartToppings: {
              create: item.cartToppings.map((t) => ({
                toppingId: t.toppingId,
                defaultQuantity: t.defaultQuantity,
                addedQuantity: t.addedQuantity,
              })),
            },
            cartIngredients: {
              create: item.cartIngredients.map((i) => ({
                ingredientId: i.ingredientId,
                defaultQuantity: i.defaultQuantity,
                addedQuantity: i.addedQuantity,
              })),
            },
          },
        })
      )
    );

    // Update user cart total
    await updateCartTotal(userCart.id);

    // Delete session cart
    await prisma.cart.delete({
      where: { id: sessionCart.id },
    });

    return res.status(200).json({
      success: true,
      message: "Carts merged successfully",
      merged: true,
      cartTotal: await getCartTotal(userCart.id),
    });
  } catch (error) {
    console.error("Merge carts error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper Functions

async function processCustomizations(selectedItems, defaults, type, model) {
  const allItems = await model.findMany({ where: { status: true } });
  const itemsToCreate = [];
  let priceAdjustment = 0;

  for (const selected of selectedItems) {
    const item = allItems.find((i) => i.id === selected[`${type}Id`]);
    if (!item) continue;

    const defaultItem = defaults.find(
      (d) => d[`${type}Id`] === selected[`${type}Id`]
    );
    const defaultQty = defaultItem?.quantity || 0;
    const selectedQty = selected.quantity;

    if (selectedQty !== defaultQty) {
      priceAdjustment += (selectedQty - defaultQty) * item.price;
    }

    itemsToCreate.push({
      [`${type}Id`]: selected[`${type}Id`],
      defaultQuantity: defaultQty,
      addedQuantity: selectedQty - defaultQty,
    });
  }

  return itemsToCreate;
}

async function updateCartTotal(cartId) {
  const newTotal = await prisma.cartItem.aggregate({
    where: { cartId },
    _sum: { finalPrice: true },
  });

  await prisma.cart.update({
    where: { id: cartId },
    data: { totalAmount: newTotal._sum.finalPrice || 0 },
  });
}

async function getCartTotal(cartId) {
  const result = await prisma.cartItem.aggregate({
    where: { cartId },
    _sum: { finalPrice: true },
  });
  return result._sum.finalPrice || 0;
}

function formatCartItem(cartItem) {
  return {
    id: cartItem.id,
    pizzaId: cartItem.pizzaId,
    pizzaName: cartItem.pizza.name,
    pizzaImage: cartItem.pizza.imageUrl,
    size: cartItem.size,
    quantity: cartItem.quantity,
    basePrice: cartItem.basePrice,
    finalPrice: cartItem.finalPrice,
    customToppings: cartItem.cartToppings.map((t) => ({
      id: t.topping.id,
      name: t.topping.name,
      defaultQuantity: t.defaultQuantity,
      addedQuantity: t.addedQuantity,
      pricePerUnit: t.topping.price,
    })),
    customIngredients: cartItem.cartIngredients.map((i) => ({
      id: i.ingredient.id,
      name: i.ingredient.name,
      defaultQuantity: i.defaultQuantity,
      addedQuantity: i.addedQuantity,
      pricePerUnit: i.ingredient.price,
    })),
  };
}

export {
  addItemToCart,
  removeCartItem,
  clearCart,
  getCartTotal,
  mergeCartsAfterLogin,
};
