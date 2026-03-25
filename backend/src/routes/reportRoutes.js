import express from "express";
import { getSalesReport, getTopProducts, exportCSV, getSummary, getPeriodReport } from "../controllers/reportController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin", "staff"));
router.get("/summary", getSummary);
router.get("/period", getPeriodReport);
router.get("/sales", getSalesReport);
router.get("/products", getTopProducts);
router.get("/csv", exportCSV);

export default router;
