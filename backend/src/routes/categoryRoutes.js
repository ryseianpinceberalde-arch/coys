import express from "express";
import { body } from "express-validator";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getCategories);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  [body("name").notEmpty()],
  createCategory
);

router.put("/:id", protect, authorizeRoles("admin"), updateCategory);
router.delete("/:id", protect, authorizeRoles("admin"), deleteCategory);

export default router;

