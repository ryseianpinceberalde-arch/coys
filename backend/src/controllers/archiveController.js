import ArchiveRecord from "../models/ArchiveRecord.js";
import Brand from "../models/Brand.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";
import { restoreArchivedDocument } from "../utils/archive.js";

const ARCHIVABLE_MODELS = {
  user: User,
  product: Product,
  category: Category,
  brand: Brand,
  supplier: Supplier
};

const formatArchiveRecord = (record) => ({
  id: String(record._id),
  entityType: record.entityType,
  entityId: record.entityId,
  recordName: record.recordName,
  reason: record.reason || "",
  deletedAt: record.deletedAt,
  deletedBy: record.deletedBy
    ? {
        id: String(record.deletedBy._id),
        name: record.deletedBy.name || "",
        email: record.deletedBy.email || ""
      }
    : null
});

export const getArchivedRecords = async (req, res) => {
  try {
    const { type = "", search = "" } = req.query;
    const filter = {};

    if (type) {
      filter.entityType = String(type).trim().toLowerCase();
    }

    if (search) {
      filter.recordName = new RegExp(String(search).trim(), "i");
    }

    const records = await ArchiveRecord.find(filter)
      .sort({ deletedAt: -1 })
      .populate("deletedBy", "name email");

    res.json(records.map(formatArchiveRecord));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const restoreArchivedRecord = async (req, res) => {
  try {
    const archiveRecord = await ArchiveRecord.findById(req.params.id);

    if (!archiveRecord) {
      return res.status(404).json({ message: "Archived record not found" });
    }

    const Model = ARCHIVABLE_MODELS[archiveRecord.entityType];
    if (!Model) {
      return res.status(400).json({ message: "This archived record cannot be restored" });
    }

    const doc = await Model.findById(archiveRecord.entityId);
    if (!doc) {
      return res.status(404).json({ message: "Original record no longer exists" });
    }

    await restoreArchivedDocument({ doc, archiveRecord });

    res.json({
      message: `${archiveRecord.recordName} restored successfully`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
