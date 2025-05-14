import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createOrderFromCart(userId, cartId, session) {
  try {
    // Get cart with all items and their details
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        cartItems: {
          include: {
            cartToppings: true,
            cartIngredients: true,
            pizza: true,
            combo: true
          }
        }
      }
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Create order with items from cart
    const order = await prisma.order.create({
      data: {
        userId: userId,
        status: "PENDING",
        totalAmount: cart.totalAmount,
        orderItems: {
          create: cart.cartItems.map(item => ({
            pizzaId: item.isCombo ? null : item.pizzaId,
            quantity: item.quantity,
            size: item.size,
            price: item.finalPrice,
            orderToppings: {
              create: item.cartToppings.map(t => ({
                name: t.topping.name,
                price: t.topping.price,
                status: true,
                include: true,
                quantity: t.addedQuantity
              }))
            },
            orderIngredients: {
              create: item.cartIngredients.map(i => ({
                name: i.ingredient.name,
                price: i.ingredient.price,
                status: true,
                include: true,
                quantity: i.addedQuantity
              }))
            }
          }))
        }
      },
      include: {
        orderItems: {
          include: {
            orderToppings: true,
            orderIngredients: true
          }
        }
      }
    });

    // Clear the cart after order creation
    await prisma.cart.update({
      where: { id: cartId },
      data: {
        cartItems: {
          deleteMany: {}
        },
        totalAmount: 0
      }
    });

    return order;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
}