import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import StoreSettings from "../models/StoreSettings.js";
import {
  createCheckoutSession,
  getCheckoutPaymentSnapshot,
  isOnlinePaymentMethod,
  isPayMongoConfigured,
  retrieveCheckoutSession
} from "../utils/paymongo.js";
import {
  createStripeCheckoutSession,
  getStripeCheckoutSnapshot,
  isStripeConfigured,
  retrieveStripeCheckoutSession
} from "../utils/stripe.js";

const generateInvoice = async () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const count = await Sale.countDocuments() + 1;
  return `CC-${y}${m}${d}-${String(count).padStart(4, "0")}`;
};

const getStoreCheckoutName = async () => {
  const settings = await StoreSettings.findOne().lean();
  return String(settings?.name || "").trim();
};

const isStripeSalePayment = (paymentMethod) => String(paymentMethod || "").toLowerCase() === "stripe";
const isPayMongoSalePayment = (paymentMethod) => isOnlinePaymentMethod(paymentMethod);

const normalizeAbsoluteUrl = (value) => {
  const normalized = String(value || "").trim();
  return /^https?:\/\/\S+$/i.test(normalized) ? normalized : "";
};

const populateSale = (saleId) =>
  Sale.findById(saleId)
    .populate("cashier", "name email")
    .populate("customer", "name email");

const restoreReservedStock = async (reservedAdjustments) => {
  for (const adjustment of reservedAdjustments) {
    await Product.findByIdAndUpdate(adjustment.productId, {
      $inc: { stockQuantity: adjustment.quantity }
    });
  }
};

const reserveStockForSale = async (saleItems) => {
  const adjustments = [];

  for (const item of saleItems) {
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: item.product,
        stockQuantity: { $gte: item.quantity }
      },
      {
        $inc: { stockQuantity: -item.quantity }
      },
      { new: true }
    );

    if (!updatedProduct) {
      await restoreReservedStock(adjustments);
      throw new Error(`Insufficient stock for "${item.name}".`);
    }

    adjustments.push({
      productId: item.product,
      quantity: item.quantity
    });
  }

  return adjustments;
};

const syncSalePaymentState = async (sale) => {
  if (
    !sale
    || !sale.paymentSessionId
  ) {
    return sale;
  }

  if (sale.paymentStatus === "paid" || sale.status === "cancelled" || sale.status === "refunded") {
    return sale;
  }

  let snapshot = null;
  let latestCheckoutUrl = "";

  if (sale.paymentProvider === "paymongo" && isPayMongoConfigured()) {
    const checkoutSession = await retrieveCheckoutSession(sale.paymentSessionId);
    snapshot = getCheckoutPaymentSnapshot(checkoutSession);
    latestCheckoutUrl = checkoutSession?.attributes?.checkout_url || "";
  } else if (sale.paymentProvider === "stripe" && isStripeConfigured()) {
    const checkoutSession = await retrieveStripeCheckoutSession(sale.paymentSessionId);
    snapshot = getStripeCheckoutSnapshot(checkoutSession);
    latestCheckoutUrl = snapshot.checkoutUrl || "";
  } else {
    return sale;
  }

  let changed = false;

  if (latestCheckoutUrl && sale.paymentUrl !== latestCheckoutUrl) {
    sale.paymentUrl = latestCheckoutUrl;
    changed = true;
  }

  if (snapshot.paymentStatus === "paid" && sale.paymentStatus !== "paid") {
    sale.paymentStatus = "paid";
    sale.paymentPaidAt = sale.paymentPaidAt || snapshot.paymentPaidAt || new Date();
    sale.paymentReceived = sale.total;
    sale.change = 0;
    if (sale.status === "pending_payment") {
      sale.status = "completed";
    }
    changed = true;
  } else if (snapshot.paymentStatus === "expired" && sale.paymentStatus !== "expired") {
    sale.paymentStatus = "expired";
    changed = true;
  }

  if (changed) {
    await sale.save();
  }

  return sale;
};

export const createSale = async (req, res) => {
  const reservedAdjustments = [];
  let createdSaleId = null;

  try {
    const {
      items,
      discountType = "none",
      discountValue = 0,
      taxRate = 0,
      paymentMethod = "cash",
      paymentReceived,
      notes,
      customerId,
      successUrl = "",
      cancelUrl = ""
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const enrichedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}`
        });
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

    const subtotal = enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);
    let discountAmount = 0;
    if (discountType === "percent") {
      discountAmount = subtotal * (Number(discountValue) / 100);
    } else if (discountType === "fixed") {
      discountAmount = Number(discountValue);
    }
    discountAmount = Math.min(discountAmount, subtotal);

    const afterDiscount = subtotal - discountAmount;
    const tax = afterDiscount * (Number(taxRate) / 100);
    const total = afterDiscount + tax;
    const received = Number(paymentReceived) || total;
    const change = Math.max(0, received - total);
    const invoiceNumber = await generateInvoice();
    const isStripe = isStripeSalePayment(paymentMethod);
    const isPayMongo = isPayMongoSalePayment(paymentMethod);
    const isHostedPayment = isStripe || isPayMongo;
    const safeSuccessUrl = normalizeAbsoluteUrl(successUrl);
    const safeCancelUrl = normalizeAbsoluteUrl(cancelUrl);

    if (isStripe) {
      if (!isStripeConfigured()) {
        return res.status(400).json({ message: "Stripe is not configured yet. Add STRIPE_SECRET_KEY to the backend environment." });
      }

      if (!safeSuccessUrl || !safeCancelUrl) {
        return res.status(400).json({ message: "Stripe checkout requires success and cancel URLs." });
      }
    }

    if (isPayMongo && !isPayMongoConfigured()) {
      return res.status(400).json({ message: "PayMongo is not configured yet. Add PAYMONGO_SECRET_KEY to the backend environment." });
    }

    const stockAdjustments = await reserveStockForSale(enrichedItems);
    reservedAdjustments.push(...stockAdjustments);

    const sale = await Sale.create({
      invoiceNumber,
      cashier: req.user._id,
      customer: customerId || null,
      source: "pos",
      items: enrichedItems,
      subtotal,
      discountAmount,
      discountType,
      discountValue: Number(discountValue),
      tax,
      taxRate: Number(taxRate),
      total,
      paymentMethod,
      paymentProvider: isStripe ? "stripe" : isPayMongo ? "paymongo" : "manual",
      paymentStatus: isHostedPayment ? "pending" : "paid",
      paymentReceived: isHostedPayment ? 0 : received,
      paymentPaidAt: isHostedPayment ? null : new Date(),
      change: isHostedPayment ? 0 : change,
      notes: notes || "",
      status: isHostedPayment ? "pending_payment" : "completed"
    });
    createdSaleId = sale._id;

    if (isPayMongo) {
      const merchantName = await getStoreCheckoutName();
      const checkoutSession = await createCheckoutSession({
        customer: {
          name: "Walk-in Customer",
          email: String(req.user?.email || "pos@example.com").trim().toLowerCase(),
          phone: String(req.user?.phone || "").trim()
        },
        notes: notes || "",
        order: {
          orderNumber: invoiceNumber,
          items: sale.items,
          total: sale.total,
          taxAmount: sale.tax,
          taxRate: sale.taxRate,
          paymentMethod: sale.paymentMethod
        },
        merchantName
      });

      sale.paymentSessionId = checkoutSession.id;
      sale.paymentUrl = checkoutSession.checkoutUrl;
      await sale.save();
    } else if (isStripe) {
      const stripeSession = await createStripeCheckoutSession({
        customerEmail: req.user?.email || "",
        clientReferenceId: invoiceNumber,
        successUrl: safeSuccessUrl,
        cancelUrl: safeCancelUrl,
        lineItems: [
          {
            name: `Sale ${invoiceNumber}`,
            description: `${enrichedItems.length} item(s) from POS checkout`,
            quantity: 1,
            amount: total,
            currency: "php"
          }
        ],
        metadata: {
          saleId: String(sale._id),
          invoiceNumber,
          source: "pos"
        }
      });

      sale.paymentSessionId = stripeSession.id;
      sale.paymentUrl = stripeSession.checkoutUrl;
      await sale.save();
    }

    const populatedSale = await populateSale(sale._id);
    res.status(201).json(populatedSale);
  } catch (err) {
    if (createdSaleId) {
      await Sale.findByIdAndDelete(createdSaleId);
    }

    if (reservedAdjustments.length) {
      await restoreReservedStock(reservedAdjustments);
    }

    res.status(400).json({ message: err.message || "Checkout failed" });
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
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59);
        filter.createdAt.$lte = end;
      }
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("cashier", "name email")
        .populate("customer", "name email"),
      Sale.countDocuments(filter)
    ]);
    res.json({ sales, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const sale = await populateSale(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    try {
      await syncSalePaymentState(sale);
    } catch {
      // Payment sync should not block receipt/detail loading.
    }

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
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    if (!["completed", "pending_payment"].includes(sale.status)) {
      return res.status(400).json({ message: "Only completed or pending-payment sales can be cancelled" });
    }

    sale.status = "cancelled";
    sale.cancelReason = reason;
    if (sale.paymentStatus !== "paid") {
      sale.paymentStatus = "failed";
    }
    await sale.save();

    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity } });
    }

    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
