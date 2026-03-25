import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadLogo } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/", protect, getSettings);
router.put("/", protect, authorizeRoles("admin"), uploadLogo.single("logo"), updateSettings);

export default router;
