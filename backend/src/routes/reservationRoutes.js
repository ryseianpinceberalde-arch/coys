import express from "express";
import { body, query } from "express-validator";
import {
  createReservation,
  getReservationTableStatus,
  getReservations,
  updateReservationStatus
} from "../controllers/reservationController.js";
import { authorizeRoles, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/table-status",
  [
    query("date").matches(/^\d{4}-\d{2}-\d{2}$/),
    query("time").matches(/^\d{2}:\d{2}$/),
    query("tableLabel").optional().isString()
  ],
  getReservationTableStatus
);

router.get("/", getReservations);

router.post(
  "/",
  [
    body("date").matches(/^\d{4}-\d{2}-\d{2}$/),
    body("time").matches(/^\d{2}:\d{2}$/),
    body("items").isArray({ min: 1 }),
    body("items.*.productId").notEmpty(),
    body("items.*.qty").isInt({ min: 1 }),
    body("customer.name").trim().notEmpty(),
    body("customer.email").isEmail(),
    body("customer.phone").matches(/^09\d{9}$/),
    body("partySize").optional().isInt({ min: 1 }),
    body("tableLabel").optional().isString(),
    body("notes").optional().isString()
  ],
  createReservation
);

router.patch(
  "/:id/status",
  authorizeRoles("admin", "staff"),
  [
    body("status").isIn(["confirmed", "arrived", "completed", "cancelled"]),
    body("reason").optional().isString()
  ],
  updateReservationStatus
);

export default router;
