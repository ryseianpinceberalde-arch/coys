import mongoose from "mongoose";

const archiveRecordSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["user", "product", "category", "brand", "supplier"]
    },
    entityId: {
      type: String,
      required: true,
      index: true
    },
    recordName: {
      type: String,
      required: true,
      trim: true
    },
    reason: {
      type: String,
      default: "",
      trim: true
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    deletedAt: {
      type: Date,
      default: Date.now
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

archiveRecordSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

export default mongoose.model("ArchiveRecord", archiveRecordSchema);
