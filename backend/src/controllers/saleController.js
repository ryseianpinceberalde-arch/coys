import Sale from "../models/Sale.js";
import Product from "../models/Product.js";

const generateInvoice = async () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const count = await Sale.countDocuments() + 1;
  return `CC-${y}${m}${d}-${String(count).padStart(4, "0")}`;
};

export const createSale = async (req, res) => {
  try {
    const { items, discountType = "none", discountValue = 0, taxRate = 0, paymentMethod = "cash", paymentReceived, notes, customerId } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ message: "Cart is empty" });

    const enrichedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product not found: ${item.product}` });
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}` });
      }
      enrichedItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku || "",
        quantity: item.quantity,
        price: product.price,
        costPrice: product.costPrice || 0,
        discount: item.discount || 0,
        subtotal: product.price * item.quantity
      });
    }

    const subtotal = enrichedItems.reduce((s, i) => s + i.subtotal, 0);
    let discountAmount = 0;
    if (discountType === "percent") discountAmount = subtotal * (Number(discountValue) / 100);
    else if (discountType === "fixed") discountAmount = Number(discountValue);
    discountAmount = Math.min(discountAmount, subtotal);

    const afterDiscount = subtotal - discountAmount;
    const tax = afterDiscount * (Number(taxRate) / 100);
    const total = afterDiscount + tax;
    const received = Number(paymentReceived) || total;
    const change = Math.max(0, received - total);

    const invoiceNumber = await generateInvoice();

    const sale = await Sale.create({
      invoiceNumber,
      cashier: req.user._id,
      customer: customerId || null,
      items: enrichedItems,
      subtotal,
      discountAmount,
      discountType,
      discountValue: Number(discountValue),
      tax,
      taxRate: Number(taxRate),
      total,
      paymentMethod,
      paymentReceived: received,
      change,
      notes: notes || "",
      status: "completed"
    });

    // Deduct stock
    for (const item of enrichedItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: -item.quantity } });
    }

    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSales = async (req, res) => {
  try {
    const { status, startDate, endDate, cashier, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (cashier) filter.cashier = cashier;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59); filter.createdAt.$lte = e; }
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [sales, total] = await Promise.all([
      Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate("cashier", "name email").populate("customer", "name email"),
      Sale.countDocuments(filter)
    ]);
    res.json({ sales, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("cashier", "name email").populate("customer", "name email");
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMySales = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { cashier: req.user._id };
    const skip = (Number(page) - 1) * Number(limit);
    const [sales, total] = await Promise.all([
      Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Sale.countDocuments(filter)
    ]);
    res.json({ sales, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const cancelSale = async (req, res) => {
  try {
    const { reason = "No reason provided" } = req.body;
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    if (sale.status !== "completed") return res.status(400).json({ message: "Only completed sales can be cancelled" });

    sale.status = "cancelled";
    sale.cancelReason = reason;
    await sale.save();

    // Restore stock
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity } });
    }

    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
