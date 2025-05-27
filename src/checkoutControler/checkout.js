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

      // Get cart details
      const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: {
          cartItems: {
            include: {
              pizza: true,
              combo: true,
              otherItem: true,
              cartToppings: {
                include: { topping: true },
              },
              cartIngredients: {
                include: { ingredient: true },
              },
            },
          },
        },
      });

      // Add debug log
      console.log(
        "Cart Items:",
        cart.cartItems.map((item) => ({
          id: item.id,
          isOtherItem: item.isOtherItem,
          otherItemId: item.otherItemId,
          size: item.size,
          price: item.finalPrice,
        }))
      );

      if (!cart) {
        throw new Error("Cart not found");
      }

      // Create order
      const order = await prisma.order.create({
        data: {
          userId: userId,
          status: "PENDING",
          totalAmount: new Decimal(totalAmount),
          deliveryMethod: deliveryMethod,
          deliveryAddress: address || null,
          pickupTime: pickupTime || null,
          customerName: name,
          paymentStatus: "PAID",
          paymentId: session.payment_intent,
          orderItems: {
            create: cart.cartItems.map((item) => ({
              pizzaId: item.isOtherItem ? null : item.pizzaId,
              comboId: item.isCombo ? item.comboId : null,
              otherItemId: item.otherItemId || null,
              quantity: item.quantity,
              size: item.size,
              price: item.finalPrice,
              isCombo: Boolean(item.isCombo),
              isOtherItem: Boolean(item.isOtherItem),
              orderToppings: {
                create: item.cartToppings.map((t) => ({
                  name: t.topping.name,
                  price: t.topping.price,
                  status: true,
                  include: true,
                  quantity: t.addedQuantity,
                })),
              },
              orderIngredients: {
                create: item.cartIngredients.map((i) => ({
                  name: i.ingredient.name,
                  price: i.ingredient.price,
                  status: true,
                  include: true,
                  quantity: i.addedQuantity,
                })),
              },
            })),
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

      // Clear the cart
      await prisma.cart.update({
        where: { id: cartId },
        data: {
          cartItems: { deleteMany: {} },
          totalAmount: 0,
        },
      });

      console.log("✅ Order created and cart cleared:", order.id);

      // Send response immediately after order creation
      return res.json({
        received: true,
        orderId: order.id,
      });
    }
  } catch (err) {
    console.error("Webhook Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
