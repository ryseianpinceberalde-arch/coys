import Sale from "../models/Sale.js";

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const buildExcelCell = (value, type = "String") =>
  `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;

const buildExcelWorkbook = ({ worksheetName, rows }) => `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40"
>
  <Worksheet ss:Name="${escapeXml(worksheetName)}">
    <Table>
      ${rows.join("")}
    </Table>
  </Worksheet>
</Workbook>`;

const getDefaultDateRange = (period = "monthly") => {
  const end = new Date();
  const start = new Date();

  if (period === "daily") start.setDate(start.getDate() - 30);
  else if (period === "weekly") start.setDate(start.getDate() - 84);
  else if (period === "yearly") return { start: new Date(start.getFullYear() - 3, 0, 1), end };
  else return { start: new Date(start.getFullYear() - 1, start.getMonth(), 1), end };

  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const getReportDateRange = ({ period = "monthly", startDate, endDate }) => {
  const { start: defaultStart, end: defaultEnd } = getDefaultDateRange(period);
  const start = startDate ? new Date(startDate) : defaultStart;
  const end = endDate ? new Date(endDate) : defaultEnd;

  start.setHours(0, 0, 0, 0);
  if (endDate) {
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

export const getSalesReport = async (req, res) => {
  try {
    const { period = "monthly", startDate, endDate } = req.query;
    const { start, end } = getReportDateRange({ period, startDate, endDate });

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
    const { period = "monthly", limit = 10, startDate, endDate } = req.query;
    const { start, end } = getReportDateRange({ period, startDate, endDate });
    const match = {
      status: "completed",
      createdAt: { $gte: start, $lte: end }
    };
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

export const exportExcelReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? (() => { const e = new Date(endDate); e.setHours(23, 59, 59); return e; })() : new Date();
    const filename = `order-history-report-${new Date().toISOString().slice(0, 10)}.xls`;
    const sales = await Sale.find({
      status: "completed",
      createdAt: { $gte: start, $lte: end }
    })
      .sort({ createdAt: -1 })
      .populate("cashier", "name")
      .populate("customer", "name email");

    const rows = [
      "<Row>"
        + buildExcelCell("Invoice No")
        + buildExcelCell("Date")
        + buildExcelCell("Source")
        + buildExcelCell("Cashier")
        + buildExcelCell("Customer")
        + buildExcelCell("Items")
        + buildExcelCell("Subtotal")
        + buildExcelCell("Discount")
        + buildExcelCell("Tax")
        + buildExcelCell("Total")
        + buildExcelCell("Payment Method")
        + buildExcelCell("Payment Status")
        + buildExcelCell("Status")
      + "</Row>"
    ];

    sales.forEach((sale) => {
      rows.push(
        "<Row>"
          + buildExcelCell(sale.invoiceNumber || "")
          + buildExcelCell(new Date(sale.createdAt).toLocaleString())
          + buildExcelCell(String(sale.source || "").toUpperCase())
          + buildExcelCell(sale.cashier?.name || "")
          + buildExcelCell(sale.customer?.name || sale.customer?.email || "Walk-in")
          + buildExcelCell(sale.items.length, "Number")
          + buildExcelCell(Number(sale.subtotal || 0).toFixed(2))
          + buildExcelCell(Number(sale.discountAmount || 0).toFixed(2))
          + buildExcelCell(Number(sale.tax || 0).toFixed(2))
          + buildExcelCell(Number(sale.total || 0).toFixed(2))
          + buildExcelCell(String(sale.paymentMethod || "").toUpperCase())
          + buildExcelCell(String(sale.paymentStatus || "").toUpperCase())
          + buildExcelCell(String(sale.status || "").toUpperCase())
        + "</Row>"
      );
    });

    const workbook = buildExcelWorkbook({
      worksheetName: "Order History",
      rows
    });

    res.setHeader("Content-Type", "application/vnd.ms-excel");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(workbook);
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
