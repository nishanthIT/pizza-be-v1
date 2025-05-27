import Stripe from "stripe";
import { PrismaClient } from "@prisma/client"; // Add this import
import { authenticateUser } from "../middleware/authMiddleware.js";
import { createOrderFromCart } from "../services/orderService.js";

// Initialize Prisma client
const prisma = new PrismaClient(); // Add this line

// Validate required environment variables
if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL environment variable is required");
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function checkout(req, res) {
  try {
    await new Promise((resolve, reject) => {
      authenticateUser(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const userId = req.user.id;

    // Get user's active cart
    const userCart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          include: {
            pizza: true,
            combo: true,
            otherItem: true, // Add this line
            cartToppings: true,
            cartIngredients: true,
          },
        },
      },
    });

    if (!userCart) {
      return res.status(400).json({ error: "No active cart found" });
    }

    console.log("User cart:", userCart);

    const {
      finalTotal,
      shippingFee,
      // deliveryFee = 1.5,
      taxAmount,
      deliveryMethod,
      name,
      address,
      pickupTime,
    } = req.body;

    const deliveryFee = 1.5; // Fixed delivery fee
    console.log("Delivery method:", deliveryMethod);

    const final_total =
      deliveryMethod == "delivery"
        ? Number(userCart.totalAmount) + Number(deliveryFee)
        : Number(userCart.totalAmount);

    // Replace the existing line_items mapping with this:
    const line_items = userCart.cartItems.map((item) => {
      // Get the item name based on type
      let itemName = "";
      if (item.isCombo && item.combo) {
        itemName = item.combo.name;
      } else if (item.isOtherItem && item.otherItem) {
        itemName = item.otherItem.name;
      } else if (item.pizza) {
        itemName = item.pizza.name;
      } else {
        itemName = "Unknown Item"; // Fallback name
      }

      return {
        price_data: {
          currency: "gbp",
          product_data: {
            name: itemName, // Now we ensure there's always a name
            description: item.isCombo
              ? "Combo Pack"
              : item.isOtherItem
              ? "Other Item"
              : `Size: ${item.size}`,
          },
          unit_amount: Math.round(Number(item.basePrice) * 100),
        },
        quantity: item.quantity,
      };
    });

    // Add fees
    if (deliveryMethod === "delivery") {
      line_items.push(
        // {
        //   price_data: {
        //     currency: "gbp",
        //     product_data: { name: "Shipping Fee" },
        //     unit_amount: Math.round(shippingFee * 100),
        //   },
        //   quantity: 1,
        // },
        {
          price_data: {
            currency: "gbp",
            product_data: { name: "Delivery Fee" },
            unit_amount: Math.round(deliveryFee * 100),
          },
          quantity: 1,
        }
      );
    }

    // Add tax
    // line_items.push({
    //   price_data: {
    //     currency: "gbp",
    //     product_data: { name: "Tax" },
    //     unit_amount: Math.round(taxAmount * 100),
    //   },
    //   quantity: 1,
    // });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url: `${process.env.FRONTEND_URL}/login?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        userId,
        cartId: userCart.id,
        deliveryMethod,
        name,
        address: address || "",
        pickupTime: pickupTime || "",
        totalAmount: Number(final_total),

        // totalAmount: finalTotal.toString(),
        //totalAmount: pizza_Total.toString(),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ error: "Checkout failed" });
  }
}

// Add webhook handler for successful payments
export async function handleStripeWebhook(req, res) {
  try {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const {
        userId,
        cartId,
        deliveryMethod,
        name,
        address,
        pickupTime,
        totalAmount,
      } = session.metadata;

      // Check if order already exists for this payment
      const existingOrder = await prisma.order.findFirst({
        where: { paymentId: session.payment_intent },
      });

      if (existingOrder) {
        console.log("Order already exists:", existingOrder.id);
        return res.json({ received: true, orderId: existingOrder.id });
      }

      // Get cart with a transaction to ensure consistency
      const result = await prisma.$transaction(async (tx) => {
        // Get cart
        const cart = await tx.cart.findUnique({
          where: { id: cartId },
          include: {
            cartItems: {
              include: {
                pizza: true,
                combo: true,
                otherItem: true,
                cartToppings: { include: { topping: true } },
                cartIngredients: { include: { ingredient: true } },
              },
            },
          },
        });

        if (!cart) {
          throw new Error("Cart not found");
        }

        // Create order
        const order = await tx.order.create({
          data: {
            userId,
            status: "PENDING",
            totalAmount: new Decimal(totalAmount),
            deliveryMethod,
            deliveryAddress: address || null,
            pickupTime: pickupTime || null,
            customerName: name,
            paymentStatus: "PAID",
            paymentId: session.payment_intent,
            orderItems: {
              create: cart.cartItems.map((item) => {
                // Debug log to verify cart item data
                console.log("Processing cart item for order:", {
                  id: item.id,
                  isOtherItem: item.isOtherItem,
                  otherItemId: item.otherItemId,
                  isCombo: item.isCombo,
                  comboId: item.comboId,
                  pizzaId: item.pizzaId,
                  size: item.size,
                  finalPrice: item.finalPrice,
                });

                // Explicitly construct the order item
                const orderItem = {
                  quantity: item.quantity,
                  size: item.size,
                  price: item.finalPrice,
                  isCombo: Boolean(item.isCombo),
                  isOtherItem: Boolean(item.isOtherItem),
                  pizzaId: null,
                  comboId: null,
                  otherItemId: null,
                };

                // Important: Set IDs based on item type
                if (item.isOtherItem && item.otherItemId) {
                  orderItem.otherItemId = item.otherItemId;
                  orderItem.isOtherItem = true;
                  // Reset other IDs
                  orderItem.pizzaId = null;
                  orderItem.comboId = null;
                } else if (item.isCombo && item.comboId) {
                  orderItem.comboId = item.comboId;
                  orderItem.isCombo = true;
                  // Reset other IDs
                  orderItem.pizzaId = null;
                  orderItem.otherItemId = null;
                } else if (item.pizzaId) {
                  orderItem.pizzaId = item.pizzaId;
                  // Reset other IDs
                  orderItem.comboId = null;
                  orderItem.otherItemId = null;
                }

                // Add debug log for final order item
                console.log("Final order item to be created:", {
                  ...orderItem,
                  hasOtherItemId: Boolean(orderItem.otherItemId),
                  hasComboId: Boolean(orderItem.comboId),
                  hasPizzaId: Boolean(orderItem.pizzaId),
                });

                // Handle toppings and ingredients only for pizzas
                if (!orderItem.isOtherItem && !orderItem.isCombo) {
                  orderItem.orderToppings = {
                    create: item.cartToppings.map((t) => ({
                      name: t.topping.name,
                      price: t.topping.price,
                      status: true,
                      include: true,
                      quantity: t.addedQuantity,
                    })),
                  };
                  orderItem.orderIngredients = {
                    create: item.cartIngredients.map((i) => ({
                      name: i.ingredient.name,
                      price: i.ingredient.price,
                      status: true,
                      include: true,
                      quantity: i.addedQuantity,
                    })),
                  };
                } else {
                  orderItem.orderToppings = { create: [] };
                  orderItem.orderIngredients = { create: [] };
                }

                return orderItem;
              }),
            },
          },
          include: {
            orderItems: {
              include: {
                pizza: true,
                combo: true,
                otherItem: true,
                orderToppings: true,
                orderIngredients: true,
              },
            },
          },
        });

        // Clear cart
        await tx.cart.update({
          where: { id: cartId },
          data: {
            cartItems: { deleteMany: {} },
            totalAmount: 0,
          },
        });

        return order;
      });

      console.log("✅ Order created successfully:", {
        id: result.id,
        items: result.orderItems.map((item) => ({
          id: item.id,
          isOtherItem: item.isOtherItem,
          otherItemId: item.otherItemId,
          size: item.size,
          price: item.price,
        })),
      });

      // After order creation, add this verification log
      console.log(
        "Order items created:",
        result.orderItems.map((item) => ({
          id: item.id,
          isOtherItem: item.isOtherItem,
          otherItemId: item.otherItemId,
          size: item.size,
          price: item.price,
          cartItemId: item.cartItemId,
          originalCartItem: cart.cartItems.find(
            (ci) =>
              ci.otherItemId === item.otherItemId ||
              ci.comboId === item.comboId ||
              ci.pizzaId === item.pizzaId
          ),
        }))
      );

      // Add after order creation
      console.log(
        "Verifying created order items:",
        result.orderItems.map((item) => ({
          id: item.id,
          isOtherItem: item.isOtherItem,
          otherItemId: item.otherItemId,
          type: item.isOtherItem ? "OTHER" : item.isCombo ? "COMBO" : "PIZZA",
          size: item.size,
          price: item.price,
        }))
      );

      // After order creation
      console.log("Final order items verification:", {
        orderItems: result.orderItems.map((item) => ({
          id: item.id,
          isOtherItem: item.isOtherItem,
          otherItemId: item.otherItemId,
          originalCartItem: cart.cartItems.find(
            (ci) =>
              ci.id === item.cartItemId || ci.otherItemId === item.otherItemId
          ),
          types: {
            isOtherItemType: typeof item.isOtherItem,
            otherItemIdType: typeof item.otherItemId,
          },
        })),
      });

      return res.json({ received: true, orderId: result.id });
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
