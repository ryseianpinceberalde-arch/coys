import express from "express";
import { body } from "express-validator";
import {
  requestRegistrationOtp,
  register,
  login,
  loginWithGoogle,
  loginWithFacebook,
  getMe,
  updateMe
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/register/request-otp",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("phone").optional({ values: "falsy" }).matches(/^09\d{9}$/)
  ],
  requestRegistrationOtp
);

router.post(
  "/register",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("phone").optional({ values: "falsy" }).matches(/^09\d{9}$/),
    body("otp").isLength({ min: 6, max: 6 }).isNumeric()
  ],
  register
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").isLength({ min: 6 })],
  login
);

router.post(
  "/google",
  [body("credential").isString().notEmpty()],
  loginWithGoogle
);

router.post(
  "/facebook",
  [body("accessToken").isString().notEmpty()],
  loginWithFacebook
);

router.get("/me", protect, getMe);
router.put(
  "/me",
  protect,
  [
    body("name").optional().notEmpty(),
    body("phone").optional({ values: "falsy" }).matches(/^09\d{9}$/),
    body("address").optional().isString()
  ],
  updateMe
);

export default router;

