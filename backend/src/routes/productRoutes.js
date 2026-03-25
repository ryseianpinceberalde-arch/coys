import express from "express";
import { body } from "express-validator";
import {
  getProducts,
  getLowStockProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadProduct as upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/low-stock", protect, authorizeRoles("admin"), getLowStockProducts);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  upload.single("image"),
  [
    body("name").notEmpty(),
    body("category").notEmpty(),
    body("price").isNumeric(),
    body("stockQuantity").isInt({ min: 0 })
  ],
  createProduct
);

router.put("/:id", protect, authorizeRoles("admin"), upload.single("image"), updateProduct);
router.delete("/:id", protect, authorizeRoles("admin"), deleteProduct);

export default router;
