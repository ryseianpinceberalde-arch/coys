import express from "express";
import { body } from "express-validator";
import {
  createOrder,
  getGuestTrackedOrder,
  getMyOrders,
  getOrderById,
  getOrders,
  updateOrderStatus
} from "../controllers/orderController.js";
import { authorizeRoles, authorizeStaffPermission, optionalAuth, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/public/:orderNumber", getGuestTrackedOrder);
router.get("/mine", protect, getMyOrders);
router.get("/", protect, authorizeRoles("admin", "staff"), authorizeStaffPermission("orders"), getOrders);
router.get("/:id", protect, authorizeStaffPermission("orders"), getOrderById);

router.post(
  "/",
  optionalAuth,
  [
    body("items").isArray({ min: 1 }).withMessage("Order must include at least one item"),
    body("items.*.productId").optional().notEmpty(),
    body("items.*.product").optional().notEmpty(),
    body("paymentMethod").optional().isIn(["cash", "gcash", "qrph", "card", "stripe"]),
    body("notes").optional().isString(),
    body("successUrl").optional().isString(),
    body("cancelUrl").optional().isString(),
    body("customer").optional().isObject()
  ],
  createOrder
);

router.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin", "staff"),
  authorizeStaffPermission("orders"),
  [
    body("status")
      .isIn(["pending", "confirmed", "preparing", "ready", "completed", "cancelled"])
      .withMessage("Invalid order status"),
    body("note").optional().isString(),
    body("reason").optional().isString()
  ],
  updateOrderStatus
);

export default router;
