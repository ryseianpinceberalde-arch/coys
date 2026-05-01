import Supplier from "../models/Supplier.js";
import { validationResult } from "express-validator";
import { archiveDocument } from "../utils/archive.js";

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isArchived: { $ne: true } }).sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createSupplier = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, isArchived: { $ne: true } },
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, isArchived: { $ne: true } });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    await archiveDocument({
      doc: supplier,
      entityType: "supplier",
      deletedBy: req.user,
      reason: req.body?.reason
    });
    res.json({ message: "Supplier moved to archive" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
