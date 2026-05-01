import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayAgg, weekAgg, monthAgg, allAgg,
      totalProducts, totalUsers, totalStaff,
      lowStockProducts, outOfStockCount,
      recentTransactions, topProducts
    ] = await Promise.all([
      Sale.aggregate([{ $match: { status: "completed", createdAt: { $gte: todayStart } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$total" } } }]),
      Sale.aggregate([{ $match: { status: "completed", createdAt: { $gte: weekStart } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$total" } } }]),
      Sale.aggregate([{ $match: { status: "completed", createdAt: { $gte: monthStart } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$total" } } }]),
      Sale.aggregate([{ $match: { status: "completed" } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$total" } } }]),
      Product.countDocuments({ isArchived: { $ne: true }, isActive: true }),
      User.countDocuments({ role: "user", isArchived: { $ne: true } }),
      User.countDocuments({ role: "staff", isArchived: { $ne: true } }),
      Product.find({ stockQuantity: { $gt: 0, $lte: 10 }, isArchived: { $ne: true } }).select("name stockQuantity reorderLevel").limit(10),
      Product.countDocuments({ stockQuantity: 0, isArchived: { $ne: true } }),
      Sale.find({ status: "completed" }).sort({ createdAt: -1 }).limit(8).populate("cashier", "name").populate("customer", "name"),
      Sale.aggregate([
        { $match: { status: "completed" } },
        { $unwind: "$items" },
        { $group: { _id: "$items.product", name: { $first: "$items.name" }, totalQty: { $sum: "$items.quantity" }, totalRevenue: { $sum: "$items.subtotal" } } },
        { $sort: { totalQty: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Build 7-day chart
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(todayStart); day.setDate(day.getDate() - i);
      const next = new Date(day); next.setDate(day.getDate() + 1);
      const r = await Sale.aggregate([{ $match: { status: "completed", createdAt: { $gte: day, $lt: next } } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]);
      chartData.push({ label: day.toLocaleDateString("en", { weekday: "short" }), value: r[0]?.total || 0, count: r[0]?.count || 0 });
    }

    res.json({
      today: { sales: todayAgg[0]?.count || 0, revenue: todayAgg[0]?.revenue || 0 },
      week: { sales: weekAgg[0]?.count || 0, revenue: weekAgg[0]?.revenue || 0 },
      month: { sales: monthAgg[0]?.count || 0, revenue: monthAgg[0]?.revenue || 0 },
      allTime: { sales: allAgg[0]?.count || 0, revenue: allAgg[0]?.revenue || 0 },
      totalProducts, totalUsers, totalStaff,
      lowStockCount: lowStockProducts.length,
      outOfStockCount,
      lowStockProducts,
      recentTransactions,
      topProducts,
      chartData
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getStaffDashboard = async (req, res) => {
  try {
    const staffId = req.user._id;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [todayAgg, allAgg, recentSales] = await Promise.all([
      Sale.aggregate([{ $match: { cashier: staffId, status: "completed", createdAt: { $gte: todayStart } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$total" } } }]),
      Sale.aggregate([{ $match: { cashier: staffId, status: "completed" } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$total" } } }]),
      Sale.find({ cashier: staffId }).sort({ createdAt: -1 }).limit(10)
    ]);

    res.json({
      today: { sales: todayAgg[0]?.count || 0, revenue: todayAgg[0]?.revenue || 0 },
      allTime: { sales: allAgg[0]?.count || 0, revenue: allAgg[0]?.revenue || 0 },
      recentSales
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
