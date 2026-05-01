import express from "express";
import { getSalesReport, getTopProducts, exportExcelReport, getSummary, getPeriodReport } from "../controllers/reportController.js";
import { protect, authorizeRoles, authorizeStaffPermission } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin", "staff"), authorizeStaffPermission("reports"));
router.get("/summary", getSummary);
router.get("/period", getPeriodReport);
router.get("/sales", getSalesReport);
router.get("/products", getTopProducts);
router.get("/excel", exportExcelReport);

export default router;
