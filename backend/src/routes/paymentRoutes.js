import express from "express";
import { getStripeReturnPage } from "../controllers/paymentController.js";

const router = express.Router();

router.get("/stripe/return", getStripeReturnPage);

export default router;
