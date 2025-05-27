import express from "express";
import {
  getAllCategories,
  getAllIngredients,
  getAllPizzaList,
  getAllToppings,
  getPizzabyCategory,
  getPizzaById,
} from "../consumerController/getPizza.js";
import { generateOtp } from "../consumerController/otp.js";
import { verifyOtp } from "../consumerController/otp.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import syncCart from "../consumerController/carteMerge.js";
import { getCart } from "../consumerController/getCart.js";
import clearCart from "../consumerController/clearCart.js";
import increment from "../consumerController/increasCart.js";
import checkout from "../checkoutControler/checkout.js";
import { validateCartPrices } from "../middleware/validateCartPrices.js";
import { getOrders } from "../consumerController/getOrder.js";
import {
  getAllcomboList,
  getComboByIdUser,
} from "../consumerController/getCombo.js";
import {
  getOtherItemByCategory,
  getOtherItemById,
} from "../consumerController/orderItemsUser.js";

const router = express.Router();

router.get("/getPizzabyCategory", getPizzabyCategory);
router.get("/getPizzaById/:id", getPizzaById);
router.get("/getAllCategories", getAllCategories);
router.get("/getAllToppings", getAllToppings);
router.get("/getAllIngredients", getAllIngredients);
router.get("/getAllPizzaList", getAllPizzaList);

// Combo routes get
router.get("/getComboById/:id", getComboByIdUser);
router.get("/getAllcomboList", getAllcomboList);

//login
router.post("/otp", generateOtp);
router.post("/verify-otp", verifyOtp);

router.post("/cart/sync", authenticateUser, validateCartPrices, syncCart);
router.get("/cart", getCart);
router.post("/cart/clear", clearCart);
router.post("/cart/increment", increment);

router.post("/create-checkout-session", checkout);
// router.post("/cart/add",add);

router.get("/getOrders", authenticateUser, getOrders);

// Auth Check Endpoint
router.get("/check-auth", authenticateUser, (req, res) => {
  res.status(200).json({
    success: true,
    isAuthenticated: true,
    user: req.user,
  });
});

// get other items by category
router.get("/getOtherItemByCategory", getOtherItemByCategory);
router.get("/getOtherItemById/:id", getOtherItemById);

export default router;
