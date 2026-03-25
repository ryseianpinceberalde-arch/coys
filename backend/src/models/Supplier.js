import mongoose from "mongoose";
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, default: "" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  notes: { type: String, default: "" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model("Supplier", supplierSchema);
