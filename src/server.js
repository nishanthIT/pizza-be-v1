// import express from "express";
// import cors from "cors";
// import adminRoutes from "./routes/adminRoutes.js";
// import path from "path";
// import { fileURLToPath } from "url";
// import getPizzaRoutes from "./routes/getPizzaRoutes.js";
// import cartRoutes from "./routes/cartRoutes.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(express.json());

// app.use(cookieParser());

// //app.use(cors());
// app.use(cors({
//   origin: 'http://localhost:3000', // Your frontend URL
//   credentials: true
// }));

// // Serve static files from the uploads directory
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// app.use("/api", adminRoutes);
// app.use("/api", getPizzaRoutes);
// app.use("/api", cartRoutes);

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import Stripe from "stripe";
import { verifyToken } from "./adminController/auth.js";

// Import routes
import adminRoutes from "./routes/adminRoutes.js";
import getPizzaRoutes from "./routes/getPizzaRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

dotenv.config();

import { PrismaClient } from "@prisma/client"; // Add this import
const prisma = new PrismaClient(); // Add this line

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // from Stripe dashboard
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // const metadata = session.metadata;

      // const order = {
      //   userId: metadata.userId,
      //   name: metadata.name,
      //   deliveryMethod: metadata.deliveryMethod,
      //   address: metadata.address,
      //   pickupTime: metadata.pickupTime,
      //   //items: JSON.parse(metadata.orderData),
      //   amountTotal: session.amount_total / 100, // in GBP
      //   paymentStatus: "paid",
      //   cartId : metadata.cartId,
      // };

      const {
        userId,
        cartId,
        deliveryMethod,
        name,
        address,
        pickupTime,
        totalAmount,
      } = session.metadata;

      console.log(totalAmount);

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
      console.log("Cart found:", cart);

      if (!cart) {
        throw new Error("Cart not found");
      }
      const order = await prisma.order.create({
        data: {
          userId: userId,
          status: "PENDING",
          totalAmount,
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
      console.log("Order created:", order);
      // Clear the cart
      await prisma.cart.update({
        where: { id: cartId },
        data: {
          cartItems: { deleteMany: {} },
          totalAmount: 0,
        },
      });

      // Save order to DB
      console.log("✅ New order:", order);
    }

    //res.send();
    res.json({ received: true });
  }
);

app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: ["http://localhost:3001", "http://localhost:8080"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Add headers middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Public routes
app.use("/api", getPizzaRoutes);
app.use("/api", cartRoutes);

// Admin routes with authentication
app.use("/api/admin", verifyToken); // Apply auth middleware only to /api/admin/* routes
app.use("/api", adminRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
