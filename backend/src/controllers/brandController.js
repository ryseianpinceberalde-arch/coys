import Brand from "../models/Brand.js";
import { validationResult } from "express-validator";
import { archiveDocument } from "../utils/archive.js";

export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isArchived: { $ne: true } }).sort({ name: 1 });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createBrand = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const brand = await Brand.create(req.body);
    res.status(201).json(brand);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Brand name already exists" });
    res.status(500).json({ message: err.message });
  }
};

export const updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findOneAndUpdate(
      { _id: req.params.id, isArchived: { $ne: true } },
      req.body,
      { new: true, runValidators: true }
    );
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    res.json(brand);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findOne({ _id: req.params.id, isArchived: { $ne: true } });
    if (!brand) return res.status(404).json({ message: "Brand not found" });
    await archiveDocument({
      doc: brand,
      entityType: "brand",
      deletedBy: req.user,
      reason: req.body?.reason
    });
    res.json({ message: "Brand moved to archive" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
