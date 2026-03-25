import express from "express";
import { body } from "express-validator";
import { getBrands, createBrand, updateBrand, deleteBrand } from "../controllers/brandController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getBrands);
router.post("/", protect, authorizeRoles("admin"), [body("name").notEmpty().withMessage("Brand name is required")], createBrand);
router.put("/:id", protect, authorizeRoles("admin"), updateBrand);
router.delete("/:id", protect, authorizeRoles("admin"), deleteBrand);

export default router;
