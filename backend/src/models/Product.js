import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    imageUrl: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lowStockThreshold: {
      type: Number,
      default: 5
    },
    sku: { type: String, sparse: true, trim: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    costPrice: { type: Number, default: 0 },
    discountPrice: { type: Number },
    reorderLevel: { type: Number, default: 10 },
    unit: {
      type: String,
      enum: ["pcs", "kg", "g", "L", "mL", "box", "pack", "bottle", "can", "dozen"],
      default: "pcs"
    },
    expirationDate: { type: Date },
    description: { type: String, default: "" },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
