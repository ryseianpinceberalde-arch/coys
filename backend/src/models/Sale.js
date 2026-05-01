import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String, required: true },
  sku: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
  source: { type: String, enum: ["pos", "mobile"], default: "pos" },
  items: [saleItemSchema],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  discountType: { type: String, enum: ["none", "percent", "fixed"], default: "none" },
  discountValue: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cash", "gcash", "qrph", "card", "stripe", "mixed"], default: "cash" },
  paymentProvider: { type: String, enum: ["manual", "paymongo", "stripe"], default: "manual" },
  paymentStatus: { type: String, enum: ["pending", "paid", "expired", "failed"], default: "paid" },
  paymentSessionId: { type: String, default: "" },
  paymentUrl: { type: String, default: "" },
  paymentPaidAt: { type: Date, default: null },
  paymentReceived: { type: Number, default: 0 },
  change: { type: Number, default: 0 },
  status: { type: String, enum: ["pending_payment", "completed", "cancelled", "refunded"], default: "completed" },
  notes: { type: String, default: "" },
  cancelReason: { type: String, default: "" },
  refundReason: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Sale", saleSchema);
