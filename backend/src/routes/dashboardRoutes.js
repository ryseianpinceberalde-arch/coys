import express from "express";
import { getAdminDashboard, getStaffDashboard } from "../controllers/dashboardController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/admin", protect, authorizeRoles("admin"), getAdminDashboard);
router.get("/staff", protect, authorizeRoles("admin", "staff"), getStaffDashboard);

export default router;
