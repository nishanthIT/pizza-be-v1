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

    const line_items = userCart.cartItems.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.isCombo ? item.combo?.name : item.pizza?.name,
          description: `Size: ${item.size}`,
        },
        // Fix: Use basePrice instead of finalPrice for unit_amount
        //unit_amount: Math.round(Number(item.basePrice) * 100), // Changed from item.finalPrice to item.basePrice
        unit_amount: Math.round(Number(item.basePrice) * 100), // Changed from item.finalPrice to item.basePrice
      },
      quantity: item.quantity,
    }));

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
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
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
              pizzaId: item.pizzaId,
              comboId: item.comboId,
              quantity: item.quantity,
              size: item.size,
              price: item.finalPrice,
              isCombo: item.isCombo,
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
      });

      // Clear the cart
      await prisma.cart.update({
        where: { id: cartId },
        data: {
          cartItems: { deleteMany: {} },
          totalAmount: 0,
        },
      });

      console.log("Order created:", order.id);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook Error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
