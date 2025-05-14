import express from "express";

import {
  addItemToCart,
  clearCart,
  getCartTotal,
  mergeCartsAfterLogin,
  removeCartItem,
} from "../consumerController/cartController.js";
import ensureSessionId from "../middleware/ensureSessionId.js"; // ✅ Import middleware

const router = express.Router();
router.use(ensureSessionId); // ✅ Use middleware

router.post("/cart/items", addItemToCart); // Add item to cart
router.delete("/cart/items/:itemId", removeCartItem); // Remove specific item
router.delete("/cart", clearCart); // Clear entire cart
router.get("/cart", getCartTotal); // Get cart contents

// Special endpoint for merging carts after login
router.post("/cart/merge", mergeCartsAfterLogin);

export default router;
