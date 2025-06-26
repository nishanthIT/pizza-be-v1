// import { PrismaClient } from "@prisma/client";
// import { authenticateUser } from "../middleware/authMiddleware.js";
// import { updateCartTotal } from "../services/cartService.js";

// const prisma = new PrismaClient();

// // Helper to normalize arrays for comparison
// function normalize(arr) {
//   return [...arr].sort((a, b) => a.id - b.id);
// }

// // Check if two arrays of {id, quantity} match
// function arraysMatch(arr1, arr2) {
//   const norm1 = normalize(arr1);
//   const norm2 = normalize(arr2);
//   if (norm1.length !== norm2.length) return false;
//   return norm1.every(
//     (item, i) => item.id === norm2[i].id && item.quantity === norm2[i].quantity
//   );
// }

// // Check if two cart items match
// function itemsMatch(a, b) {
//   if (b.isCombo) {
//     return a.comboId === b.id;
//   }
//   if (b.isOtherItem) {
//     return a.otherItemId === b.id;
//   }
//   return (
//     a.pizzaId === b.pizzaId &&
//     a.size === b.size &&
//     arraysMatch(a.toppings, b.toppings) &&
//     arraysMatch(a.ingredients, b.ingredients)
//   );
// }

// export default async function syncCart(req, res) {
//   console.log("Sync Cart hit");

//   try {
//     // Authenticate user manually
//     await new Promise((resolve, reject) => {
//       authenticateUser(req, res, (err) => {
//         if (err) return reject(err);
//         resolve();
//       });
//     });

//     const userId = req.user.id;
//     const localItems = req.body.cartItems || [];

//     console.log("Received localItems:", localItems);
//     console.log("User ID:", userId);

//     // Find or create cart
//     let cart = await prisma.cart.findFirst({
//       where: { userId },
//       include: {
//         cartItems: {
//           include: {
//             pizza: true,
//             combo: true,
//             otherItem: true,
//             cartToppings: true,
//             cartIngredients: true,
//           },
//         },
//       },
//     });

//     if (!cart) {
//       cart = await prisma.cart.create({
//         data: { userId },
//       });

//       // Re-fetch cart to include cartItems
//       cart = await prisma.cart.findUnique({
//         where: { id: cart.id },
//         include: {
//           cartItems: {
//             include: {
//               pizza: true,
//               combo: true,
//               otherItem: true,
//               cartToppings: true,
//               cartIngredients: true,
//             },
//           },
//         },
//       });
//     }

//     const updatedItems = [...(cart.cartItems || [])];

//     for (const localItem of localItems) {
//       const pizzaId = localItem.pizzaId || localItem.pizza?.id || localItem.id;
//       if (!pizzaId) {
//         console.warn("Skipping item with missing pizzaId:", localItem);
//         continue;
//       }

//       const toppings =
//         localItem.toppings ||
//         localItem.cartToppings?.map((t) => ({
//           id: t.toppingId,
//           quantity: t.addedQuantity,
//         })) ||
//         [];

//       const ingredients =
//         localItem.ingredients ||
//         localItem.cartIngredients?.map((i) => ({
//           id: i.ingredientId,
//           quantity: i.addedQuantity,
//         })) ||
//         [];

//       const existing = cart.cartItems.find((item) =>
//         itemsMatch(
//           {
//             pizzaId: item.pizzaId,
//             size: item.size,
//             toppings: item.cartToppings.map((t) => ({
//               id: t.toppingId,
//               quantity: t.addedQuantity,
//             })),
//             ingredients: item.cartIngredients.map((i) => ({
//               id: i.ingredientId,
//               quantity: i.addedQuantity,
//             })),
//           },
//           {
//             pizzaId,
//             size: localItem.size,
//             toppings,
//             ingredients,
//           }
//         )
//       );

//       const finalPrice =
//         Number(localItem.price) || Number(localItem.finalPrice) || 0;
//       const eachPrice =
//         Number(localItem.eachprice) || Number(localItem.basePrice) || 0;

//       if (existing) {
//         const updatedItem = await prisma.cartItem.update({
//           where: { id: existing.id },
//           data: {
//             quantity: { increment: localItem.quantity },
//             finalPrice: Number(existing.finalPrice) + Number(finalPrice), // <--- this line
//           },
//         });

//         // Replace the item in the updatedItems array
//         const index = updatedItems.findIndex((i) => i.id === existing.id);
//         if (index !== -1) updatedItems[index] = updatedItem;
//       } else if (localItem.isCombo) {
//         const newItem = await prisma.cartItem.create({
//           data: {
//             cartId: cart.id,
//             comboId: localItem.id,
//             pizzaId: null,
//             size: "COMBO",
//             quantity: localItem.quantity,
//             basePrice: Number(localItem.eachprice),
//             // Fix: Multiply finalPrice by quantity for combos
//             finalPrice: Number(localItem.eachprice) * localItem.quantity,
//             isCombo: true,
//           },
//         });
//         updatedItems.push(newItem);
//       } else if (localItem.isOtherItem) {
//         const newItem = await prisma.cartItem.create({
//           data: {
//             cartId: cart.id,
//             otherItemId: localItem.id,
//             pizzaId: null,
//             comboId: null,
//             size: "OTHER",
//             quantity: localItem.quantity,
//             basePrice: Number(localItem.eachprice),
//             finalPrice: Number(localItem.eachprice) * localItem.quantity,
//             isOtherItem: true,
//           },
//         });
//         updatedItems.push(newItem);
//       } else {
//         const newItem = await prisma.cartItem.create({
//           data: {
//             cartId: cart.id,
//             pizzaId: pizzaId,
//             comboId: null, // Set comboId to null for regular pizzas
//             size: localItem.size,
//             quantity: localItem.quantity,
//             basePrice: eachPrice,
//             finalPrice: finalPrice,
//             cartToppings: {
//               create: toppings.map((t) => ({
//                 toppingId: t.id,
//                 defaultQuantity: 0,
//                 addedQuantity: t.quantity,
//               })),
//             },
//             cartIngredients: {
//               create: ingredients.map((i) => ({
//                 ingredientId: i.id,
//                 defaultQuantity: 0,
//                 addedQuantity: i.quantity,
//               })),
//             },
//           },
//           include: {
//             cartToppings: true,
//             cartIngredients: true,
//           },
//         });
//         updatedItems.push(newItem);
//       }
//     }

//     // Add these debug logs after processing items
//     console.log(
//       "Cart Items after processing:",
//       updatedItems.map((item) => ({
//         finalPrice: item.finalPrice,
//         quantity: item.quantity,
//       }))
//     );

//     // Replace existing console logs with this simpler version
//     const totalPrice = await prisma.cartItem.aggregate({
//       where: { cartId: cart.id },
//       _sum: { finalPrice: true },
//     });

//     // Add this simple console log for final price
//     console.log(
//       "Cart Final Total: $",
//       Number(totalPrice._sum.finalPrice).toFixed(2)
//     );

//     // Update cart total - do this only once
//     const updatedCart = await prisma.cart.update({
//       where: { id: cart.id },
//       data: {
//         totalAmount: totalPrice._sum.finalPrice || 0,
//         createdAt: new Date(),
//       },
//     });

//     const totalQuantity = await prisma.cartItem.aggregate({
//       where: { cartId: cart.id },
//       _sum: { quantity: true },
//     });

//     res.json({
//       items: updatedItems,
//       totalQuantity: totalQuantity._sum.quantity || 0,
//       totalPrice: totalPrice._sum.finalPrice || 0,
//     });
//   } catch (err) {
//     console.error("Error in syncCart:", err);
//     res.status(500).json({ error: "Internal server error during cart sync." });
//   }
// }


import { PrismaClient } from "@prisma/client";
import { authenticateUser } from "../middleware/authMiddleware.js";

// Optimize Prisma client with connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Reduce connection pool to prevent overwhelming the database
  __internal: {
    engine: {
      connectionLimit: 10,
    },
  },
});

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

// FIXED: Check if two cart items match
function itemsMatch(existingItem, localItem) {
  // For combo items
  if (localItem.isCombo) {
    return existingItem.comboId === localItem.id && existingItem.isCombo;
  }
  
  // For other items
  if (localItem.isOtherItem) {
    return existingItem.otherItemId === localItem.id && existingItem.isOtherItem;
  }
  
  // For pizza items - check pizza ID, size, toppings, and ingredients
  const pizzaId = localItem.pizzaId || localItem.pizza?.id || localItem.id;
  
  return (
    existingItem.pizzaId === pizzaId &&
    existingItem.size === localItem.size &&
    arraysMatch(
      existingItem.toppings || [],
      localItem.toppings || []
    ) &&
    arraysMatch(
      existingItem.ingredients || [],
      localItem.ingredients || []
    ) &&
    !existingItem.isCombo &&
    !existingItem.isOtherItem
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

    // OPTIMIZATION 1: Find existing cart or create new one efficiently
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          include: {
            pizza: true,
            combo: true,
            otherItem: true,
            cartToppings: true,
            cartIngredients: true,
          },
        },
      },
    });

    // Create cart if it doesn't exist
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          cartItems: {
            include: {
              pizza: true,
              combo: true,
              otherItem: true,
              cartToppings: true,
              cartIngredients: true,
            },
          },
        },
      });
    }

    // OPTIMIZATION 2: Batch process items - prepare all operations first
    const itemsToUpdate = [];
    const itemsToCreate = [];

    for (const localItem of localItems) {
      // FIXED: Better handling of different item types
      let pizzaId = null;
      if (!localItem.isCombo && !localItem.isOtherItem) {
        pizzaId = localItem.pizzaId || localItem.pizza?.id || localItem.id;
        if (!pizzaId) {
          console.warn("Skipping pizza item with missing pizzaId:", localItem);
          continue;
        }
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

      // FIXED: Find existing item with proper matching logic
      const existing = cart.cartItems.find((item) => {
        const itemWithToppingsAndIngredients = {
          ...item,
          toppings: item.cartToppings?.map((t) => ({
            id: t.toppingId,
            quantity: t.addedQuantity,
          })) || [],
          ingredients: item.cartIngredients?.map((i) => ({
            id: i.ingredientId,
            quantity: i.addedQuantity,
          })) || [],
        };
        
        return itemsMatch(itemWithToppingsAndIngredients, localItem);
      });

      const finalPrice =
        Number(localItem.price) || Number(localItem.finalPrice) || 0;
      const eachPrice =
        Number(localItem.eachprice) || Number(localItem.basePrice) || 0;

      if (existing) {
        // FIXED: Update existing item quantities
        itemsToUpdate.push({
          id: existing.id,
          quantity: existing.quantity + localItem.quantity,
          finalPrice: Number(existing.finalPrice) + Number(finalPrice),
        });
      } else {
        // FIXED: Create new item with proper data structure
        if (localItem.isCombo) {
          itemsToCreate.push({
            cartId: cart.id,
            comboId: localItem.id,
            pizzaId: null,
            otherItemId: null,
            size: "COMBO",
            quantity: localItem.quantity,
            basePrice: Number(localItem.eachprice || 0),
            finalPrice: Number(localItem.eachprice || 0) * localItem.quantity,
            isCombo: true,
            isOtherItem: false,
            toppings: [],
            ingredients: [],
          });
        } else if (localItem.isOtherItem) {
          itemsToCreate.push({
            cartId: cart.id,
            otherItemId: localItem.id,
            pizzaId: null,
            comboId: null,
            size: "OTHER",
            quantity: localItem.quantity,
            basePrice: Number(localItem.eachprice || 0),
            finalPrice: Number(localItem.eachprice || 0) * localItem.quantity,
            isCombo: false,
            isOtherItem: true,
            toppings: [],
            ingredients: [],
          });
        } else {
          itemsToCreate.push({
            cartId: cart.id,
            pizzaId: pizzaId,
            comboId: null,
            otherItemId: null,
            size: localItem.size,
            quantity: localItem.quantity,
            basePrice: eachPrice,
            finalPrice: finalPrice,
            isCombo: false,
            isOtherItem: false,
            toppings: toppings,
            ingredients: ingredients,
          });
        }
      }
    }

    // OPTIMIZATION 3: Execute all operations in a single efficient transaction
    const result = await prisma.$transaction(async (tx) => {
      // Batch update existing items
      const updatePromises = itemsToUpdate.map(item =>
        tx.cartItem.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity,
            finalPrice: item.finalPrice,
          },
        })
      );

      // Batch create new items
      const createPromises = itemsToCreate.map(item => {
        if (item.toppings.length > 0 || item.ingredients.length > 0) {
          // Create pizza items with toppings/ingredients
          return tx.cartItem.create({
            data: {
              cartId: item.cartId,
              pizzaId: item.pizzaId,
              comboId: item.comboId,
              otherItemId: item.otherItemId,
              size: item.size,
              quantity: item.quantity,
              basePrice: item.basePrice,
              finalPrice: item.finalPrice,
              isCombo: item.isCombo,
              isOtherItem: item.isOtherItem,
              cartToppings: {
                create: item.toppings.map((t) => ({
                  toppingId: t.id,
                  defaultQuantity: 0,
                  addedQuantity: t.quantity,
                })),
              },
              cartIngredients: {
                create: item.ingredients.map((i) => ({
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
        } else {
          // Create simple items (combos, other items)
          return tx.cartItem.create({
            data: {
              cartId: item.cartId,
              pizzaId: item.pizzaId,
              comboId: item.comboId,
              otherItemId: item.otherItemId,
              size: item.size,
              quantity: item.quantity,
              basePrice: item.basePrice,
              finalPrice: item.finalPrice,
              isCombo: item.isCombo,
              isOtherItem: item.isOtherItem,
            },
          });
        }
      });

      // Execute all updates and creates in parallel
      const [updatedItems, createdItems] = await Promise.all([
        Promise.all(updatePromises),
        Promise.all(createPromises),
      ]);

      // OPTIMIZATION 4: Single aggregation query for totals
      const [totalPrice, totalQuantity] = await Promise.all([
        tx.cartItem.aggregate({
          where: { cartId: cart.id },
          _sum: { finalPrice: true },
        }),
        tx.cartItem.aggregate({
          where: { cartId: cart.id },
          _sum: { quantity: true },
        }),
      ]);

      // Update cart total - single operation
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          totalAmount: totalPrice._sum.finalPrice || 0,
        },
      });

      return {
        updatedItems,
        createdItems,
        totalPrice: totalPrice._sum.finalPrice || 0,
        totalQuantity: totalQuantity._sum.quantity || 0,
      };
    }, {
      // Set transaction timeout to prevent hanging
      timeout: 10000, // 10 seconds
    });

    console.log(
      "Cart Items processed:",
      `Updated: ${result.updatedItems.length}, Created: ${result.createdItems.length}`
    );

    console.log(
      "Cart Final Total: $",
      Number(result.totalPrice).toFixed(2)
    );

    // OPTIMIZATION 5: Return combined results without additional DB queries
    const allItems = [...result.updatedItems, ...result.createdItems];

    res.json({
      items: allItems,
      totalQuantity: result.totalQuantity,
      totalPrice: result.totalPrice,
    });

  } catch (err) {
    console.error("Error in syncCart:", err);
    
    // Handle specific database connection errors
    if (err.message.includes("Can't reach database server")) {
      return res.status(503).json({ 
        error: "Database temporarily unavailable. Please try again in a moment." 
      });
    }
    
    if (err.code === 'P2024') { // Transaction timeout
      return res.status(408).json({ 
        error: "Request timeout. Please try again with fewer items." 
      });
    }
    
    res.status(500).json({ 
      error: "Internal server error during cart sync.",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}
