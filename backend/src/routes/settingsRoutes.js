import express from "express";
import {
  downloadDatabaseBackup,
  getPublicSettings,
  getSettings,
  updateSettings
} from "../controllers/settingsController.js";
import { protect, authorizeRoles, authorizeStaffPermission } from "../middleware/authMiddleware.js";
import { uploadLogo } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get(["/public", "/public."], getPublicSettings);
router.get("/backup", protect, authorizeRoles("admin"), downloadDatabaseBackup);
router.get("/", protect, authorizeRoles("admin", "staff"), authorizeStaffPermission("settings"), getSettings);
router.put("/", protect, authorizeRoles("admin", "staff"), authorizeStaffPermission("settings"), uploadLogo.single("logo"), updateSettings);

export default router;
