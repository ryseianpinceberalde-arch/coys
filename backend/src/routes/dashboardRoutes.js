import express from "express";
import { getAdminDashboard, getStaffDashboard } from "../controllers/dashboardController.js";
import { protect, authorizeRoles, authorizeStaffPermission } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/admin", protect, authorizeRoles("admin"), getAdminDashboard);
router.get("/staff", protect, authorizeRoles("admin", "staff"), authorizeStaffPermission("dashboard"), getStaffDashboard);

export default router;
