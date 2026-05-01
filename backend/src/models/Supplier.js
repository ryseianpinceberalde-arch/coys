import mongoose from "mongoose";
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, default: "" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },
  notes: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  archiveReason: { type: String, default: "" }
}, { timestamps: true });
export default mongoose.model("Supplier", supplierSchema);
