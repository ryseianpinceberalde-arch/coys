import Sale from "../models/Sale.js";
import Product from "../models/Product.js";

export const getSalesReport = async (req, res) => {
  try {
    const { period = "monthly", startDate, endDate } = req.query;
    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate); start.setHours(0, 0, 0, 0);
      end = new Date(endDate); end.setHours(23, 59, 59, 999);
    } else {
      end = new Date();
      start = new Date();
      if (period === "daily") start.setDate(start.getDate() - 30);
      else if (period === "weekly") start.setDate(start.getDate() - 84);
      else if (period === "yearly") start = new Date(start.getFullYear() - 3, 0, 1);
      else { start = new Date(start.getFullYear() - 1, start.getMonth(), 1); }
      start.setHours(0, 0, 0, 0);
    }

    let groupId;
    if (period === "daily") groupId = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } };
    else if (period === "weekly") groupId = { year: { $year: "$createdAt" }, week: { $week: "$createdAt" } };
    else if (period === "yearly") groupId = { year: { $year: "$createdAt" } };
    else groupId = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };

    const [data, summary] = await Promise.all([
      Sale.aggregate([
        { $match: { status: "completed", createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: groupId, total: { $sum: "$total" }, count: { $sum: 1 }, discount: { $sum: "$discountAmount" }, tax: { $sum: "$tax" } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
      ]),
      Sale.aggregate([
        { $match: { status: "completed", createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" }, totalTransactions: { $sum: 1 }, avgOrderValue: { $avg: "$total" }, totalDiscount: { $sum: "$discountAmount" }, totalTax: { $sum: "$tax" } } }
      ])
    ]);

    res.json({ data, summary: summary[0] || { totalRevenue: 0, totalTransactions: 0, avgOrderValue: 0, totalDiscount: 0, totalTax: 0 } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    const match = { status: "completed" };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23, 59, 59); match.createdAt.$lte = e; }
    }
    const data = await Sale.aggregate([
      { $match: match },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", name: { $first: "$items.name" }, totalQty: { $sum: "$items.quantity" }, totalRevenue: { $sum: "$items.subtotal" } } },
      { $sort: { totalQty: -1 } },
      { $limit: Number(limit) }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const exportCSV = async (req, res) => {
  try {
    const { type = "sales", startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? (() => { const e = new Date(endDate); e.setHours(23, 59, 59); return e; })() : new Date();

    let csv = "";
    const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === "sales") {
      const sales = await Sale.find({ status: "completed", createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).populate("cashier", "name");
      csv = "Invoice No,Date,Cashier,Items,Subtotal,Discount,Tax,Total,Payment Method\n";
      sales.forEach(s => {
        csv += `${s.invoiceNumber},"${new Date(s.createdAt).toLocaleString()}","${s.cashier?.name || ""}",${s.items.length},${s.subtotal.toFixed(2)},${s.discountAmount.toFixed(2)},${s.tax.toFixed(2)},${s.total.toFixed(2)},${s.paymentMethod}\n`;
      });
    } else if (type === "products") {
      const products = await Product.find({ isArchived: false }).populate("category", "name").populate("brand", "name");
      csv = "Name,SKU,Category,Brand,Selling Price,Cost Price,Stock,Reorder Level,Unit,Status\n";
      products.forEach(p => {
        csv += `"${p.name}","${p.sku || ""}","${p.category?.name || ""}","${p.brand?.name || ""}",${p.price},${p.costPrice || 0},${p.stockQuantity},${p.reorderLevel || 10},${p.unit || "pcs"},${p.isActive ? "Active" : "Inactive"}\n`;
      });
    } else if (type === "inventory") {
      const products = await Product.find({ isArchived: false }).populate("category", "name").populate("supplier", "name");
      csv = "Name,SKU,Category,Supplier,Stock,Reorder Level,Cost Price,Selling Price,Inventory Value\n";
      products.forEach(p => {
        const value = (p.costPrice || 0) * p.stockQuantity;
        csv += `"${p.name}","${p.sku || ""}","${p.category?.name || ""}","${p.supplier?.name || ""}",${p.stockQuantity},${p.reorderLevel || 10},${p.costPrice || 0},${p.price},${value.toFixed(2)}\n`;
      });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSummary = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [todaySales, allSales] = await Promise.all([
      Sale.aggregate([{ $match: { status: "completed", createdAt: { $gte: today } } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } }]),
      Sale.aggregate([{ $match: { status: "completed" } }, { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$total" } } }])
    ]);
    res.json({ todaySalesCount: todaySales[0]?.count || 0, todaySalesAmount: todaySales[0]?.total || 0, totalSalesCount: allSales[0]?.count || 0, totalSalesAmount: allSales[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPeriodReport = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    let groupId;
    if (period === "daily") groupId = { month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } };
    else if (period === "monthly") groupId = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };
    else groupId = { year: { $year: "$createdAt" } };

    const data = await Sale.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: groupId, total: { $sum: "$total" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
      { $limit: 30 }
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
