import express from "express";
import {
  addTopping,
  deleteTopping,
  getToppings,
  updateStatusinTopping,
  updateTopping,
} from "../adminController/toppings.js";
import {
  addIngredient,
  deleteIngredient,
  getIngredients,
  updateIngredient,
  updateStatusinIngredient,
} from "../adminController/ingredients.js";
import {
  addCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../adminController/category.js";
import {
  addPizza,
  deletePizza,
  getAllPizzas,
  updatePizza,
} from "../adminController/pizzaController.js";
import {
  addComboOffer,
  deleteComboOffer,
  editComboOffer,
  getComboOffer,
} from "../adminController/comboOffers.js";
import serveImmg from "../consumerController/imageController.js";
import { convertToPng, upload } from "../middleware/upload.js";
import {
  changeOrderStatus,
  getAllOrders,
  getOrderDetails,
} from "../adminController/order.js";
import { login, verifyToken } from "../adminController/auth.js";
import {
  addOtherItem,
  deleteOtherItem,
  getAllOtherItems,
  updateOtherItem,
} from "../adminController/otherItems.js";

const router = express.Router();

// Public routes (no auth required)
router.get("/images/:imageName", serveImmg);
router.post("/login", login); // Changed back to /admin/login

// Protected routes with middleware
router.use("/admin", verifyToken); // Apply middleware to all admin routes
const adminRouter = express.Router();

// Admin routes (protected routes)
adminRouter.post("/addTopping", addTopping);
adminRouter.put("/updateTopping", updateTopping);
adminRouter.put("/updateStatusTopping", updateStatusinTopping);
adminRouter.delete("/deleteTopping", deleteTopping);
adminRouter.get("/getToppings", getToppings);

// Admin ingredients
adminRouter.post("/addIngredient", addIngredient);
adminRouter.put("/updateIngredient", updateIngredient);
adminRouter.put("/updateStatusIngredient", updateStatusinIngredient);
adminRouter.delete("/deleteIngredient", deleteIngredient);
adminRouter.get("/getIngredients", getIngredients);

// Admin category
adminRouter.post("/addCategory", addCategory);
adminRouter.put("/updateCategory", updateCategory);
adminRouter.delete("/deleteCategory", deleteCategory);
adminRouter.get("/getCategories", getCategories);

// Admin pizza
adminRouter.post("/addPizza", upload.single("image"), convertToPng, addPizza);
adminRouter.put(
  "/updatePizza",
  upload.single("image"),
  convertToPng,
  updatePizza
);
adminRouter.delete("/deletePizza", deletePizza);
adminRouter.get("/getAllPizzas", getAllPizzas);

// Admin combo
adminRouter.post(
  "/addComboOffer",
  upload.single("image"),
  convertToPng,
  addComboOffer
);
adminRouter.get("/getComboOffer", getComboOffer);
adminRouter.delete("/deleteComboOffer", deleteComboOffer);
adminRouter.put(
  "/editComboOffer",
  upload.single("image"),
  convertToPng,
  editComboOffer
);

// add otherItems
adminRouter.post(
  "/addOtherItem",
  upload.single("image"),
  convertToPng,
  addOtherItem
);
adminRouter.put(
  "/updateOtherItem",
  upload.single("image"),
  convertToPng,
  updateOtherItem
);
adminRouter.delete("/deleteOtherItem/:id", deleteOtherItem);
adminRouter.get("/getAllOtherItems", getAllOtherItems);

// Admin orders
adminRouter.get("/getOrderDetails/:id", getOrderDetails);
adminRouter.get("/getAllOrders", getAllOrders);
adminRouter.put("/changeOrderStatus/:id", changeOrderStatus);

// Mount the admin router under /admin path
router.use("/admin", adminRouter);

export default router;
