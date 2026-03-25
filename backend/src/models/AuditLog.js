import mongoose from "mongoose";
const auditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  entity: { type: String, default: "" },
  entityId: { type: String, default: "" },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
export default mongoose.model("AuditLog", auditSchema);
