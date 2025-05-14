import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

export const generateSessionId = () => uuidv4();

export const getOrCreateCart = async ({ userId, sessionId }) => {
  return await prisma.cart.upsert({
    where: {
      [userId ? "userId" : "sessionId"]: userId || sessionId,
    },
    create: {
      ...(userId ? { userId } : { sessionId }),
      totalAmount: 0,
    },
    update: {},
    include: { cartItems: true },
  });
};

export const updateCartTotal = async (cartId) => {
  const aggregate = await prisma.cartItem.aggregate({
    where: { cartId },
    _sum: { finalPrice: true },
  });

  return await prisma.cart.update({
    where: { id: cartId },
    data: { totalAmount: aggregate._sum.finalPrice || 0 },
  });
};

export const mergeCarts = async (userId, sessionId) => {
  return await prisma.$transaction(async (tx) => {
    const guestCart = await tx.cart.findUnique({
      where: { sessionId },
      include: { cartItems: true },
    });

    if (!guestCart) return null;

    const userCart = await getOrCreateCart({ userId });

    // Transfer items
    await Promise.all(
      guestCart.cartItems.map((item) =>
        tx.cartItem.update({
          where: { id: item.id },
          data: { cartId: userCart.id },
        })
      )
    );

    await updateCartTotal(userCart.id);
    await tx.cart.delete({ where: { id: guestCart.id } });

    return userCart;
  });
};
