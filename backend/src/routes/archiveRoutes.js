import express from "express";
import { getArchivedRecords, restoreArchivedRecord } from "../controllers/archiveController.js";
import { authorizeRoles, authorizeStaffPermission, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin", "staff"),
  authorizeStaffPermission("archive"),
  getArchivedRecords
);

router.post(
  "/:id/restore",
  protect,
  authorizeRoles("admin", "staff"),
  authorizeStaffPermission("archive"),
  restoreArchivedRecord
);

export default router;
