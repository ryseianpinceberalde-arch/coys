import ArchiveRecord from "../models/ArchiveRecord.js";

const deriveRecordName = (value) =>
  String(
    value?.name
    || value?.title
    || value?.email
    || value?.orderNumber
    || value?.invoiceNumber
    || value?.reference
    || value?._id
    || ""
  ).trim();

const toSnapshot = (doc) => {
  if (!doc) {
    return {};
  }

  if (typeof doc.toObject === "function") {
    return doc.toObject({ depopulate: true });
  }

  return { ...doc };
};

export const archiveDocument = async ({ doc, entityType, deletedBy, reason = "" }) => {
  const snapshot = toSnapshot(doc);
  const recordName = deriveRecordName(snapshot);
  const trimmedReason = String(reason || "").trim();

  doc.isArchived = true;
  doc.archivedAt = new Date();
  doc.archivedBy = deletedBy?._id || null;
  doc.archiveReason = trimmedReason;

  if (typeof doc.isActive === "boolean") {
    doc.isActive = false;
  }

  await doc.save();

  await ArchiveRecord.findOneAndUpdate(
    { entityType, entityId: String(doc._id) },
    {
      entityType,
      entityId: String(doc._id),
      recordName: recordName || String(doc._id),
      reason: trimmedReason,
      deletedBy: deletedBy?._id || null,
      deletedAt: doc.archivedAt,
      snapshot
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

export const restoreArchivedDocument = async ({ doc, archiveRecord }) => {
  const snapshot = archiveRecord?.snapshot || {};

  doc.isArchived = false;
  doc.archivedAt = null;
  doc.archivedBy = null;
  doc.archiveReason = "";

  if (typeof snapshot.isActive === "boolean" && typeof doc.isActive === "boolean") {
    doc.isActive = snapshot.isActive;
  }

  await doc.save();
  await archiveRecord.deleteOne();
};
