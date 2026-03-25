import express from "express";
import { getSales, getSaleById, getMySales, createSale, cancelSale } from "../controllers/saleController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin", "staff"), getSales);
router.get("/mine", protect, getMySales);
router.get("/:id", protect, getSaleById);
router.post("/", protect, authorizeRoles("admin", "staff"), createSale);
router.post("/:id/cancel", protect, authorizeRoles("admin"), cancelSale);

export default router;
