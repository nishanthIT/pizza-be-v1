// Create a new file: consumerController/getOrders.js

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        orderItems: {
          include: {
            pizza: true,
            orderToppings: true,
            orderIngredients: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching your orders",
      error: error.message,
    });
  }
};

// Add this route to your router (in consumer.js)
// router.get("/orders", authenticateUser, getOrders);
