import { validationResult } from "express-validator";
import Product from "../models/Product.js";
import InventoryLog from "../models/InventoryLog.js";

export const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { isArchived: false };
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { barcode: new RegExp(search, "i") },
        { sku: new RegExp(search, "i") }
      ];
    }
    const products = await Product.find(query)
      .populate("category", "name")
      .populate("brand", "name")
      .populate("supplier", "name")
      .sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isArchived: false,
      $expr: { $lte: ["$stockQuantity", "$reorderLevel"] }
    }).populate("category", "name");
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      name, barcode, category, price, stockQuantity, imageUrl,
      sku, brand, supplier, costPrice, discountPrice, reorderLevel,
      unit, expirationDate, description, isActive, isArchived
    } = req.body;

    // If a file was uploaded, use its path; otherwise fall back to imageUrl in body
    const resolvedImage = req.file
      ? `/uploads/products/${req.file.filename}`
      : (imageUrl || "");

    const productData = {
      name, category, price: parseFloat(price), stockQuantity: parseInt(stockQuantity),
      ...(barcode && { barcode }),
      ...(sku && { sku }),
      ...(brand && { brand }),
      ...(supplier && { supplier }),
      ...(resolvedImage && { imageUrl: resolvedImage }),
      ...(costPrice !== undefined && costPrice !== "" && { costPrice: parseFloat(costPrice) }),
      ...(discountPrice !== undefined && discountPrice !== "" && { discountPrice: parseFloat(discountPrice) }),
      ...(reorderLevel !== undefined && { reorderLevel: parseInt(reorderLevel) || 10 }),
      ...(unit && { unit }),
      ...(expirationDate && { expirationDate }),
      ...(description !== undefined && { description }),
      isActive: isActive === "false" ? false : Boolean(isActive !== undefined ? isActive : true),
      isArchived: isArchived === "true" ? true : false
    };

    const product = await Product.create(productData);

    await InventoryLog.create({
      product: product._id,
      type: "stock_in",
      quantityChange: stockQuantity,
      previousQuantity: 0,
      newQuantity: stockQuantity,
      createdBy: req.user?._id
    });

    const populated = await Product.findById(product._id)
      .populate("category", "name")
      .populate("brand", "name")
      .populate("supplier", "name");

    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "A product with that barcode or SKU already exists" });
    res.status(500).json({ message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const prevQty = product.stockQuantity;

    const fields = [
      "name", "barcode", "category",
      "isActive", "isArchived", "sku", "brand", "supplier",
      "unit", "expirationDate", "description"
    ];
    fields.forEach(f => {
      if (req.body[f] !== undefined) product[f] = req.body[f];
    });

    // Numeric fields
    if (req.body.price !== undefined) product.price = parseFloat(req.body.price);
    if (req.body.stockQuantity !== undefined) product.stockQuantity = parseInt(req.body.stockQuantity);
    if (req.body.costPrice !== undefined && req.body.costPrice !== "") product.costPrice = parseFloat(req.body.costPrice);
    if (req.body.discountPrice !== undefined && req.body.discountPrice !== "") product.discountPrice = parseFloat(req.body.discountPrice);
    if (req.body.reorderLevel !== undefined) product.reorderLevel = parseInt(req.body.reorderLevel) || 10;

    // Boolean fields from FormData come as strings
    if (req.body.isActive !== undefined) product.isActive = req.body.isActive === "false" ? false : Boolean(req.body.isActive);
    if (req.body.isArchived !== undefined) product.isArchived = req.body.isArchived === "true";

    // Handle image: new upload takes priority, then explicit imageUrl, else keep existing
    if (req.file) {
      product.imageUrl = `/uploads/products/${req.file.filename}`;
    } else if (req.body.imageUrl !== undefined) {
      product.imageUrl = req.body.imageUrl;
    }

    // Clear optional fields if empty string sent
    if (req.body.brand === "" || req.body.brand === null) product.brand = undefined;
    if (req.body.supplier === "" || req.body.supplier === null) product.supplier = undefined;
    if (req.body.sku === "") product.sku = undefined;
    if (req.body.barcode === "") product.barcode = undefined;

    await product.save();

    if (req.body.stockQuantity !== undefined && req.body.stockQuantity !== prevQty) {
      const newQty = Number(req.body.stockQuantity);
      await InventoryLog.create({
        product: product._id,
        type: newQty > prevQty ? "stock_in" : "stock_out",
        quantityChange: newQty - prevQty,
        previousQuantity: prevQty,
        newQuantity: newQty,
        createdBy: req.user?._id
      });
    }

    const populated = await Product.findById(product._id)
      .populate("category", "name")
      .populate("brand", "name")
      .populate("supplier", "name");

    res.json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "A product with that barcode or SKU already exists" });
    res.status(500).json({ message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
