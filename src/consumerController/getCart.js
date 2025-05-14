// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// export const getCart = async (req, res) => {
//     const { userId } = req.query;

//     const cart = await prisma.cart.findFirst({
//       where: { userId },
//       include: {
//         cartItems: {
//           include: {
//             pizza: true,
//             cartToppings: true,
//             cartIngredients: true
//           }
//         }
//       }
//     });

//     res.status(200).json(cart);

// }
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getCart = async (req, res) => {
  const { userId } = req.query;

  try {
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          include: {
            pizza: true,
            cartToppings: {
              include: {
                topping: {
                  select: { name: true },
                },
              },
            },
            cartIngredients: {
              include: {
                ingredient: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (cart) {
      // Flatten the names
      const flattenedCart = {
        ...cart,
        cartItems: cart.cartItems.map((item) => ({
          ...item,
          cartToppings: item.cartToppings.map((t) => ({
            ...t,
            name: t.topping.name,
          })),
          cartIngredients: item.cartIngredients.map((i) => ({
            ...i,
            name: i.ingredient.name,
          })),
        })),
      };

      res.status(200).json(flattenedCart);
    } else {
      res.status(404).json({ error: "Cart not found" });
    }
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// export const getCart = async (req, res) => {
//   const { userId } = req.query;

//   try {
//     const cart = await prisma.cart.findFirst({
//       where: { userId },
//       include: {
//         cartItems: {
//           include: {
//             pizza: true,
//             cartToppings: {
//               include: {
//                 topping: {
//                   select: { name: true },
//                 },
//               },
//             },
//             cartIngredients: {
//               include: {
//                 ingredient: {
//                   select: { name: true },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });

//     if (cart) {
//       res.status(200).json(cart);
//     } else {
//       res.status(404).json({ error: "Cart not found" });
//     }
//   } catch (error) {
//     console.error("Error fetching cart:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const getCart = async (req, res) => {
//     const { userId } = req.query;

//     try {
//         const cart = await prisma.cart.findFirst({
//             where: { userId },
//             include: {
//                 cartItems: {
//                     include: {
//                         pizza: true,
//                         cartToppings: true,
//                         cartIngredients: true
//                     }
//                 }
//             }
//         });

//         if (cart) {
//             res.status(200).json(cart);
//         } else {
//             res.status(404).json({ error: "Cart not found" });
//         }
//     } catch (error) {
//         console.error("Error fetching cart:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// };
