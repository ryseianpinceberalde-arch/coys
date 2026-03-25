import express from "express";
import { body } from "express-validator";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from "../controllers/userController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require login
router.use(protect);

// Admin sees everyone; staff sees only role=user accounts
router.get("/", authorizeRoles("admin", "staff"), getUsers);

// Admin can create any role; staff can only create role=user
router.post(
  "/",
  authorizeRoles("admin", "staff"),
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("role").isIn(["admin", "staff", "user"])
  ],
  createUser
);

// Admin can update anyone; staff can only update role=user accounts
router.put("/:id", authorizeRoles("admin", "staff"), updateUser);

// Only admin can delete
router.delete("/:id", authorizeRoles("admin"), deleteUser);

export default router;
