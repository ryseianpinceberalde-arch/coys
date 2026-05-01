import crypto from "crypto";
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import InventoryLog from "../models/InventoryLog.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import StoreSettings from "../models/StoreSettings.js";
import { publishOrderCreated, publishOrderUpdated } from "../realtime/realtimeServer.js";
import { serializeOrder } from "../utils/orderPresentation.js";
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
import { canTransitionOrderStatus, getNextOrderStatuses } from "../utils/orderRules.js";

const PHONE_REGEX = /^09\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getStoreTaxRate = async () => {
  const settings = await StoreSettings.findOne().lean();
  return Number(settings?.taxRate || 0);
};

const getStoreCheckoutName = async () => {
  const settings = await StoreSettings.findOne().lean();
  return String(settings?.name || "").trim();
};

const getNextDailyOrderSequence = async () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const countToday = await Order.countDocuments({
    createdAt: { $gte: start, $lt: end }
  });

  return countToday + 1;
};

const buildOrderNumber = async (sequence = null) => {
  const now = new Date();
  const compactDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const nextSequence = Number.isInteger(sequence) && sequence > 0
    ? sequence
    : await getNextDailyOrderSequence();

  return `ORD-${compactDate}-${String(nextSequence).padStart(4, "0")}`;
};

const buildInvoiceNumber = async () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const count = await Sale.countDocuments();
  return `CC-${y}${m}${d}-${String(count + 1).padStart(4, "0")}`;
};

const buildCustomerPayload = (reqUser, customer = {}) => {
  const payload = {
    name: (customer.name || reqUser?.name || "").trim(),
    email: (customer.email || reqUser?.email || "").trim().toLowerCase(),
    phone: (customer.phone || reqUser?.phone || "").trim(),
    address: (customer.address || reqUser?.address || "").trim()
  };

  if (!payload.name) {
    throw new Error("Customer name is required");
  }

  if (!EMAIL_REGEX.test(payload.email)) {
    throw new Error("A valid customer email is required");
  }

  if (!PHONE_REGEX.test(payload.phone)) {
    throw new Error("Customer phone must use 09XXXXXXXXX format");
  }

  return payload;
};

const findOrderByIdentifier = (identifier, { includeGuestAccessToken = false } = {}) => {
  const filter =
    mongoose.Types.ObjectId.isValid(identifier)
      ? { $or: [{ _id: identifier }, { orderNumber: identifier }] }
      : { orderNumber: identifier };

  let query = Order.findOne(filter).populate("customerUser", "name email role");

  if (includeGuestAccessToken) {
    query = query.select("+guestAccessToken");
  }

  return query;
};

const assertOrderAccess = (order, reqUser) => {
  if (!order || !reqUser) {
    return false;
  }

  if (reqUser.role === "admin" || reqUser.role === "staff") {
    return true;
  }

  return String(order.customerUser?._id || order.customerUser) === String(reqUser._id);
};

const appendTimelineEntry = (order, status, actor, note = "") => {
  order.timeline.push({
    status,
    note,
    actorUser: actor?._id || null,
    actorName: actor?.name || "",
    actorRole: actor?.role || ""
  });
};

const restoreReservedStock = async (reservedAdjustments) => {
  for (const adjustment of reservedAdjustments) {
    await Product.findByIdAndUpdate(adjustment.productId, {
      $inc: { stockQuantity: adjustment.quantity }
    });
  }
};

const reserveStockForOrder = async (orderItems) => {
  const adjustments = [];

  for (const item of orderItems) {
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: item.product,
        isArchived: { $ne: true },
        isActive: true,
        stockQuantity: { $gte: item.quantity }
      },
      {
        $inc: { stockQuantity: -item.quantity }
      },
      { new: true }
    );

    if (!updatedProduct) {
      await restoreReservedStock(adjustments);
      throw new Error(`Insufficient stock for "${item.name}"`);
    }

    adjustments.push({
      productId: item.product,
      quantity: item.quantity,
      previousQuantity: updatedProduct.stockQuantity + item.quantity,
      newQuantity: updatedProduct.stockQuantity
    });
  }

  return adjustments;
};

const createInventoryLogsForReservation = async (orderNumber, adjustments, createdBy) => {
  if (!adjustments.length) {
    return;
  }

  await InventoryLog.create(
    adjustments.map((adjustment) => ({
      product: adjustment.productId,
      type: "stock_out",
      quantityChange: -adjustment.quantity,
      previousQuantity: adjustment.previousQuantity,
      newQuantity: adjustment.newQuantity,
      note: `Mobile order ${orderNumber} created`,
      createdBy: createdBy || null
    }))
  );
};

const restoreOrderStock = async (order, createdBy) => {
  for (const item of order.items) {
    const product = await Product.findById(item.product).select("stockQuantity");
    if (!product) {
      continue;
    }

    const previousQuantity = Number(product.stockQuantity || 0);
    const updatedProduct = await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stockQuantity: item.quantity } },
      { new: true }
    );

    await InventoryLog.create({
      product: item.product,
      type: "stock_in",
      quantityChange: item.quantity,
      previousQuantity,
      newQuantity: updatedProduct?.stockQuantity ?? previousQuantity + item.quantity,
      note: `Mobile order ${order.orderNumber} cancelled`,
      createdBy: createdBy || null
    });
  }
};

const createSaleFromOrder = async (order, cashier) => {
  const invoiceNumber = await buildInvoiceNumber();

  return Sale.create({
    invoiceNumber,
    customer: order.customerUser?._id || order.customerUser || null,
    cashier: cashier._id,
    order: order._id,
    source: "mobile",
    items: order.items.map((item) => ({
      product: item.product,
      name: item.name,
      sku: item.sku || "",
      quantity: item.quantity,
      price: item.price,
      costPrice: 0,
      discount: 0,
      subtotal: item.subtotal
    })),
    subtotal: order.subtotal,
    discountAmount: 0,
    discountType: "none",
    discountValue: 0,
    tax: order.taxAmount,
    taxRate: order.taxRate,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentProvider: order.paymentProvider || "manual",
    paymentStatus: order.paymentStatus === "paid" ? "paid" : "pending",
    paymentPaidAt: order.paymentPaidAt || (order.paymentStatus === "paid" ? new Date() : null),
    paymentReceived: order.total,
    change: 0,
    notes: [`Mobile order ${order.orderNumber}`, order.notes].filter(Boolean).join(" | "),
    status: "completed"
  });
};

const isStripeOrderPayment = (paymentMethod) => String(paymentMethod || "").toLowerCase() === "stripe";
const isManualOrderPayment = (order) => String(order?.paymentProvider || "").toLowerCase() === "manual";
const canAdvanceOrderWithoutPayment = (order) => isManualOrderPayment(order);

const syncOrdersPaymentState = async (orders = []) => {
  await Promise.all(
    orders.map(async (order) => {
      if (!order?.paymentSessionId || order.paymentStatus === "paid") {
        return;
      }

      try {
        await syncOrderPaymentState(order);
      } catch {
        // Order lists should still load if payment sync fails for one record.
      }
    })
  );
};

const syncOrderPaymentState = async (order) => {
  if (
    !order
    || order.paymentStatus === "paid"
    || !order.paymentSessionId
  ) {
    return order;
  }

  let snapshot = null;
  let latestCheckoutUrl = "";

  if (order.paymentProvider === "paymongo" && isPayMongoConfigured()) {
    const checkoutSession = await retrieveCheckoutSession(order.paymentSessionId);
    snapshot = getCheckoutPaymentSnapshot(checkoutSession);
    latestCheckoutUrl = checkoutSession?.attributes?.checkout_url || "";
  } else if (order.paymentProvider === "stripe" && isStripeConfigured()) {
    const checkoutSession = await retrieveStripeCheckoutSession(order.paymentSessionId);
    snapshot = getStripeCheckoutSnapshot(checkoutSession);
    latestCheckoutUrl = snapshot.checkoutUrl || "";
  } else {
    return order;
  }

  let changed = false;

  if (snapshot.paymentStatus === "paid" && order.paymentStatus !== "paid") {
    order.paymentStatus = "paid";
    order.paymentPaidAt = snapshot.paymentPaidAt || new Date();
    changed = true;
  }

  if (latestCheckoutUrl && order.paymentUrl !== latestCheckoutUrl) {
    order.paymentUrl = latestCheckoutUrl;
    changed = true;
  }

  if (changed) {
    await order.save();
  }

  return order;
};

export const createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const reservedAdjustments = [];
  let createdOrderId = null;
  let createdOrderNumber = "";

  try {
    const {
      items = [],
      customer = {},
      notes = "",
      paymentMethod = "cash",
      successUrl = "",
      cancelUrl = ""
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const normalizedCustomer = buildCustomerPayload(req.user, customer);
    const uniqueIds = [...new Set(items.map((item) => item.productId || item.product))];
    const products = await Product.find({
      _id: { $in: uniqueIds },
      isArchived: { $ne: true },
      isActive: true
    }).lean();

    if (products.length !== uniqueIds.length) {
      return res.status(400).json({ message: "One or more selected products are unavailable" });
    }

    const productsById = new Map(products.map((product) => [String(product._id), product]));
    const orderItems = items.map((item) => {
      const productId = String(item.productId || item.product || "");
      const quantity = Number(item.quantity || item.qty || 0);
      const product = productsById.get(productId);

      if (!product || !Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Invalid order item detected");
      }

      const price = Number(product.discountPrice ?? product.price ?? 0);

      return {
        product: product._id,
        name: product.name,
        sku: product.sku || "",
        imageUrl: product.imageUrl || "",
        quantity,
        price,
        subtotal: price * quantity
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxRate = await getStoreTaxRate();
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const queueNumber = await getNextDailyOrderSequence();
    const orderNumber = await buildOrderNumber(queueNumber);
    const guestAccessToken = req.user ? "" : crypto.randomBytes(16).toString("hex");

    const stockAdjustments = await reserveStockForOrder(orderItems);
    reservedAdjustments.push(...stockAdjustments);

    const order = await Order.create({
      orderNumber,
      queueNumber,
      customerUser: req.user?._id || null,
      customer: normalizedCustomer,
      items: orderItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      paymentMethod,
      paymentProvider: isStripeOrderPayment(paymentMethod)
        ? "stripe"
        : isOnlinePaymentMethod(paymentMethod)
          ? "paymongo"
          : "manual",
      paymentStatus: "pending",
      notes: String(notes || "").trim(),
      guestAccessToken,
      timeline: [
        {
          status: "pending",
          note: "Order placed from mobile app",
          actorUser: req.user?._id || null,
          actorName: req.user?.name || normalizedCustomer.name,
          actorRole: req.user?.role || "guest"
        }
      ]
    });
    createdOrderId = order._id;
    createdOrderNumber = order.orderNumber;

    await createInventoryLogsForReservation(order.orderNumber, stockAdjustments, req.user?._id || null);

    if (isOnlinePaymentMethod(paymentMethod)) {
      if (!isPayMongoConfigured()) {
        throw new Error("Online payments are not configured yet. Add PAYMONGO_SECRET_KEY to the backend environment.");
      }

      const merchantName = await getStoreCheckoutName();
      const checkoutSession = await createCheckoutSession({
        customer: normalizedCustomer,
        notes: order.notes,
        order,
        merchantName
      });

      order.paymentSessionId = checkoutSession.id;
      order.paymentUrl = checkoutSession.checkoutUrl;
      await order.save();
    } else if (isStripeOrderPayment(paymentMethod)) {
      if (!isStripeConfigured()) {
        throw new Error("Stripe is not configured yet. Add STRIPE_SECRET_KEY to the backend environment.");
      }

      const checkoutSession = await createStripeCheckoutSession({
        customerEmail: normalizedCustomer.email,
        clientReferenceId: order.orderNumber,
        successUrl,
        cancelUrl,
        lineItems: [
          {
            name: `Order ${order.orderNumber}`,
            description: `${order.items.length} item(s) from mobile checkout`,
            quantity: 1,
            amount: order.total,
            currency: "php"
          }
        ],
        metadata: {
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          source: "mobile"
        }
      });

      order.paymentSessionId = checkoutSession.id;
      order.paymentUrl = checkoutSession.checkoutUrl;
      await order.save();
    }

    const createdOrder = await findOrderByIdentifier(order._id, {
      includeGuestAccessToken: !req.user
    });

    publishOrderCreated(createdOrder);

    res.status(201).json({
      ok: true,
      order: serializeOrder(createdOrder, {
        includeGuestAccessToken: !req.user
      })
    });
  } catch (error) {
    if (createdOrderId) {
      await Order.findByIdAndDelete(createdOrderId);
    }

    if (createdOrderNumber) {
      await InventoryLog.deleteMany({ note: `Mobile order ${createdOrderNumber} created` });
    }

    if (reservedAdjustments.length) {
      await restoreReservedStock(reservedAdjustments);
    }

    res.status(400).json({ message: error.message || "Unable to create order" });
  }
};

export const getOrders = async (req, res) => {
  try {
    const { status = "all", search = "", page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { orderNumber: regex },
        { "customer.name": regex },
        { "customer.email": regex },
        { "customer.phone": regex }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("customerUser", "name email role"),
      Order.countDocuments(filter)
    ]);

    await syncOrdersPaymentState(orders);

    res.json({
      orders: orders.map((order) => serializeOrder(order)),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerUser: req.user._id })
      .sort({ createdAt: -1 })
      .populate("customerUser", "name email role");

    await syncOrdersPaymentState(orders);

    res.json(orders.map((order) => serializeOrder(order)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await findOrderByIdentifier(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!assertOrderAccess(order, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      await syncOrderPaymentState(order);
    } catch {
      // Payment sync should not block order details from loading.
    }

    res.json(serializeOrder(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGuestTrackedOrder = async (req, res) => {
  try {
    const accessToken = String(req.query.accessToken || "");
    const order = await findOrderByIdentifier(req.params.orderNumber, {
      includeGuestAccessToken: true
    });

    if (!order || !order.guestAccessToken || order.guestAccessToken !== accessToken) {
      return res.status(404).json({ message: "Tracked order not found" });
    }

    try {
      await syncOrderPaymentState(order);
    } catch {
      // Guest tracking should still work even if payment sync fails.
    }

    res.json(serializeOrder(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status, note = "", reason = "" } = req.body;
    const nextStatus = String(status || "").toLowerCase();

    const order = await findOrderByIdentifier(req.params.id, {
      includeGuestAccessToken: true
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      const allowed = getNextOrderStatuses(order.status);
      return res.status(400).json({
        message: allowed.length
          ? `Invalid status transition. Allowed next statuses: ${allowed.join(", ")}`
          : "This order can no longer be updated"
      });
    }

    if (order.status === nextStatus) {
      return res.json(serializeOrder(order));
    }

    if (!canAdvanceOrderWithoutPayment(order) && nextStatus !== "cancelled") {
      try {
        await syncOrderPaymentState(order);
      } catch {
        // Surface the existing order state if the payment provider cannot be reached.
      }

      if (order.paymentStatus !== "paid") {
        return res.status(400).json({
          message: "This order must be paid before it can be confirmed or prepared."
        });
      }
    }

    if (nextStatus === "cancelled") {
      if (!isManualOrderPayment(order) && order.paymentStatus === "paid") {
        return res.status(400).json({
          message: "Paid online orders cannot be cancelled from this screen."
        });
      }

      order.cancelReason = String(reason || note || "Cancelled by staff").trim();
      order.cancelledAt = new Date();
      await restoreOrderStock(order, req.user._id);
    }

    if (nextStatus === "completed") {
      order.completedAt = new Date();

      if (isManualOrderPayment(order)) {
        order.paymentStatus = "paid";
        order.paymentPaidAt = order.paymentPaidAt || new Date();
      }

      if (!order.sale) {
        const sale = await createSaleFromOrder(order, req.user);
        order.sale = sale._id;
      }
    }

    order.status = nextStatus;
    appendTimelineEntry(order, nextStatus, req.user, String(note || reason || "").trim());
    await order.save();

    const updatedOrder = await findOrderByIdentifier(order._id, {
      includeGuestAccessToken: true
    });

    publishOrderUpdated(updatedOrder);

    res.json(serializeOrder(updatedOrder));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
