import mongoose from "mongoose";
const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  archiveReason: { type: String, default: "" }
}, { timestamps: true });
export default mongoose.model("Brand", brandSchema);
