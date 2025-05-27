import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware to validate and recalculate cart prices before syncing
 * This ensures that all prices are calculated server-side for security
 * and prevents price manipulation from the client
 */
export const validateCartPrices = async (req, res, next) => {
  console.log("Validating cart prices...");

  try {
    const localItems = req.body.cartItems || [];
    if (!localItems.length) {
      return next(); // No items to validate
    }

    // Create a validated copy of the cart items
    const validatedItems = [];

    for (const item of localItems) {
      if (item.isCombo) {
        // For combos, verify the price from database
        const combo = await prisma.comboOffers.findUnique({
          where: { id: item.id },
        });

        if (!combo) {
          console.warn(`Combo with ID ${item.id} not found`);
          continue;
        }

        validatedItems.push({
          ...item,
          price: Number(combo.price),
          finalPrice: Number(combo.price) * item.quantity,
          eachprice: Number(combo.price),
        });
      } else if (item.isOtherItem) {
        // For other items, verify the price from database
        const otherItem = await prisma.otherItem.findUnique({
          where: { id: item.id },
        });

        if (!otherItem) {
          console.warn(`OtherItem with ID ${item.id} not found`);
          continue;
        }

        validatedItems.push({
          ...item,
          price: Number(otherItem.price),
          finalPrice: Number(otherItem.price) * item.quantity,
          eachprice: Number(otherItem.price),
          isOtherItem: true,
        });
      } else {
        // Extract the item details
        const pizzaId = item.pizzaId || item.pizza?.id || item.id;
        const size = item.size || "Small";
        const quantity = parseInt(item.quantity, 10) || 1;

        if (!pizzaId) {
          console.warn("Skipping item with missing pizzaId:", item);
          continue;
        }

        // Fetch the pizza from the database with relations
        const pizza = await prisma.pizza.findUnique({
          where: { id: pizzaId },
          include: {
            defaultIngredients: {
              include: {
                ingredient: true, // Include actual ingredient data from IngredientsList
              },
            },
            defaultToppings: {
              include: {
                topping: true, // Include actual topping data from ToppingsList
              },
            },
          },
        });

        if (!pizza) {
          console.warn(`Pizza with ID ${pizzaId} not found`);
          continue;
        }

        // Parse pizza sizes
        const sizes =
          typeof pizza.sizes === "string"
            ? JSON.parse(pizza.sizes)
            : pizza.sizes;

        // Get base price for the selected size - standardize size names for comparison
        const sizeUpper = size.toUpperCase();
        let basePrice = parseFloat(sizes.SMALL || 0);
        if (sizeUpper === "MEDIUM" && sizes.MEDIUM) {
          basePrice = parseFloat(sizes.MEDIUM);
        } else if (sizeUpper === "LARGE" && sizes.LARGE) {
          basePrice = parseFloat(sizes.LARGE);
        }

        // Process ingredients
        const ingredients = item.ingredients || [];
        let ingredientsTotalPrice = 0;

        // Fetch all ingredients directly from the database to get latest prices
        const ingredientIds = ingredients.map((ing) => ing.id);
        const dbIngredients = await prisma.ingredientsList.findMany({
          where: {
            id: { in: ingredientIds },
            status: true, // Only include active ingredients
          },
        });

        // Map of ingredient IDs to their latest prices from the database
        const ingredientPriceMap = new Map();
        dbIngredients.forEach((ing) => {
          ingredientPriceMap.set(ing.id, parseFloat(ing.price));
        });

        // Calculate ingredient price adjustments using the latest prices
        for (const ing of ingredients) {
          if (!ingredientPriceMap.has(ing.id)) {
            console.warn(`Ingredient with ID ${ing.id} not found or inactive`);
            continue; // Skip invalid or inactive ingredients
          }

          const defaultIng = pizza.defaultIngredients?.find(
            (di) => di.ingredientId === ing.id
          );
          const defaultQuantity = defaultIng ? defaultIng.quantity : 0;
          const ingPrice = ingredientPriceMap.get(ing.id);

          if (ing.quantity > defaultQuantity) {
            ingredientsTotalPrice +=
              (ing.quantity - defaultQuantity) * ingPrice;
          } else if (ing.quantity < defaultQuantity) {
            // Discount for removed ingredients
            ingredientsTotalPrice -=
              (defaultQuantity - ing.quantity) * ingPrice;
          }
        }

        // Process toppings
        const toppings = item.toppings || [];
        let toppingsTotalPrice = 0;

        // Fetch all toppings directly from the database to get latest prices
        const toppingIds = toppings.map((top) => top.id);
        const dbToppings = await prisma.toppingsList.findMany({
          where: {
            id: { in: toppingIds },
            status: true, // Only include active toppings
          },
        });

        // Map of topping IDs to their latest prices from the database
        const toppingPriceMap = new Map();
        dbToppings.forEach((top) => {
          toppingPriceMap.set(top.id, parseFloat(top.price));
        });

        // Calculate topping price adjustments using the latest prices
        for (const top of toppings) {
          if (!toppingPriceMap.has(top.id)) {
            console.warn(`Topping with ID ${top.id} not found or inactive`);
            continue; // Skip invalid or inactive toppings
          }

          const defaultTop = pizza.defaultToppings?.find(
            (dt) => dt.toppingId === top.id
          );
          const defaultQuantity = defaultTop ? defaultTop.quantity : 0;
          const topPrice = toppingPriceMap.get(top.id);

          if (top.quantity > defaultQuantity) {
            toppingsTotalPrice += (top.quantity - defaultQuantity) * topPrice;
          } else if (top.quantity < defaultQuantity) {
            // Discount for removed toppings
            toppingsTotalPrice -= (defaultQuantity - top.quantity) * topPrice;
          }
        }

        // Calculate final unit price
        let adjustedPrice =
          basePrice + ingredientsTotalPrice + toppingsTotalPrice;

        // Ensure price doesn't go below base price
        adjustedPrice = Math.max(adjustedPrice, basePrice);

        // Calculate total price for the quantity
        const eachPrice = Number(adjustedPrice.toFixed(2)); // Round to 2 decimal places
        const finalPrice = Number((eachPrice * quantity).toFixed(2));

        // Create validated item with recalculated prices
        validatedItems.push({
          ...item,
          eachprice: eachPrice,
          basePrice: basePrice,
          price: finalPrice,
          finalPrice: finalPrice,
        });

        console.log(
          `Validated item: ${
            pizza.name
          }, Size: ${size}, Quantity: ${quantity}, Price: ${finalPrice} (Base: ${basePrice}, Ingredients: +${ingredientsTotalPrice.toFixed(
            2
          )}, Toppings: +${toppingsTotalPrice.toFixed(2)})`
        );
      }
    }

    // Update the cart items with validated prices
    req.body.cartItems = validatedItems;

    // Log validation result
    console.log(`Validated ${validatedItems.length} items`);

    next();
  } catch (error) {
    console.error("Error validating cart prices:", error);
    return res.status(500).json({ error: "Error validating cart prices" });
  }
};
