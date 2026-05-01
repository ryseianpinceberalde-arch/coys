import { validationResult } from "express-validator";
import Category from "../models/Category.js";
import { archiveDocument } from "../utils/archive.js";

export const getCategories = async (req, res) => {
  const categories = await Category.find({ isArchived: { $ne: true } }).sort("name");
  res.json(categories);
};

export const createCategory = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name, description } = req.body;
  const exists = await Category.findOne({ name });
  if (exists) {
    return res.status(400).json({ message: "Category already exists" });
  }
  const category = await Category.create({ name, description });
  res.status(201).json(category);
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const category = await Category.findOne({ _id: id, isArchived: { $ne: true } });
  if (!category) return res.status(404).json({ message: "Category not found" });

  const { name, description } = req.body;
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;

  await category.save();
  res.json(category);
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  const category = await Category.findOne({ _id: id, isArchived: { $ne: true } });
  if (!category) return res.status(404).json({ message: "Category not found" });
  await archiveDocument({
    doc: category,
    entityType: "category",
    deletedBy: req.user,
    reason: req.body?.reason
  });
  res.json({ message: "Category moved to archive" });
};

