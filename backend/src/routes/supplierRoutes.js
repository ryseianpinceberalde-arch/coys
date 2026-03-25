import express from "express";
import { body } from "express-validator";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../controllers/supplierController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin", "staff"), getSuppliers);
router.post("/", protect, authorizeRoles("admin"), [body("name").notEmpty().withMessage("Supplier name is required")], createSupplier);
router.put("/:id", protect, authorizeRoles("admin"), updateSupplier);
router.delete("/:id", protect, authorizeRoles("admin"), deleteSupplier);

export default router;
