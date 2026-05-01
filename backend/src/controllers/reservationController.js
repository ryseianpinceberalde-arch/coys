import { validationResult } from "express-validator";
import Product from "../models/Product.js";
import Reservation from "../models/Reservation.js";

const ACTIVE_RESERVATION_STATUSES = ["pending", "confirmed", "arrived"];

const formatReservationDate = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const formatReservationTime = (timeSlot) => {
  const [hours, minutes] = timeSlot.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return timeSlot;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
};

const getStatusOptions = (status) => {
  switch (status) {
    case "pending":
      return ["confirmed", "arrived", "cancelled"];
    case "confirmed":
      return ["arrived", "cancelled"];
    case "arrived":
      return ["completed", "cancelled"];
    default:
      return [];
  }
};

const normalizeTableLabel = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const createEmptyTableMonitor = (message = "No specific table selected yet.") => ({
  tracked: false,
  isFree: null,
  isFirstInLine: false,
  queuePosition: null,
  nextQueuePosition: null,
  activeReservations: 0,
  status: "unassigned",
  message
});

const getTableQueueKey = ({ dateKey = "", timeSlot = "", tableLabel = "" }) => {
  const normalizedTableLabel = normalizeTableLabel(tableLabel);
  if (!dateKey || !timeSlot || !normalizedTableLabel) {
    return "";
  }

  return `${dateKey}::${timeSlot}::${normalizedTableLabel}`;
};

const sortReservationsByQueueOrder = (left, right) => {
  const leftCreatedAt = new Date(left.createdAt || 0).getTime();
  const rightCreatedAt = new Date(right.createdAt || 0).getTime();

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  return String(left.reference || "").localeCompare(String(right.reference || ""));
};

const getSlotFilters = (reservations) => {
  const seen = new Set();

  return reservations.reduce((filters, reservation) => {
    if (!normalizeTableLabel(reservation.tableLabel)) {
      return filters;
    }

    const dateKey = String(reservation.dateKey || "").trim();
    const timeSlot = String(reservation.timeSlot || "").trim();
    if (!dateKey || !timeSlot) {
      return filters;
    }

    const slotKey = `${dateKey}::${timeSlot}`;
    if (seen.has(slotKey)) {
      return filters;
    }

    seen.add(slotKey);
    filters.push({ dateKey, timeSlot });
    return filters;
  }, []);
};

const getActiveTableQueues = async (slotFilters) => {
  if (!slotFilters.length) {
    return new Map();
  }

  const activeReservations = await Reservation.find({
    status: { $in: ACTIVE_RESERVATION_STATUSES },
    $or: slotFilters
  })
    .select("reference dateKey timeSlot tableLabel createdAt")
    .lean();

  const queues = new Map();

  activeReservations.forEach((reservation) => {
    const key = getTableQueueKey(reservation);
    if (!key) {
      return;
    }

    if (!queues.has(key)) {
      queues.set(key, []);
    }

    queues.get(key).push(reservation);
  });

  queues.forEach((queue) => queue.sort(sortReservationsByQueueOrder));

  return queues;
};

const buildTableMonitor = (reservation, tableQueues) => {
  const key = getTableQueueKey(reservation);
  if (!key) {
    return createEmptyTableMonitor();
  }

  const queue = tableQueues.get(key) || [];
  const currentIndex = queue.findIndex((entry) => entry.reference === reservation.reference);

  if (currentIndex === 0) {
    return {
      tracked: true,
      isFree: false,
      isFirstInLine: true,
      queuePosition: 1,
      nextQueuePosition: 1,
      activeReservations: queue.length,
      status: "reserved",
      message: "You are first in line for this table and time slot."
    };
  }

  if (currentIndex > 0) {
    return {
      tracked: true,
      isFree: false,
      isFirstInLine: false,
      queuePosition: currentIndex + 1,
      nextQueuePosition: currentIndex + 1,
      activeReservations: queue.length,
      status: "waiting",
      message: `${currentIndex} reservation${currentIndex === 1 ? "" : "s"} ahead of you for this table and time slot.`
    };
  }

  if (!queue.length) {
    return {
      tracked: true,
      isFree: true,
      isFirstInLine: false,
      queuePosition: null,
      nextQueuePosition: 1,
      activeReservations: 0,
      status: "free",
      message: "This table is currently free for the selected date and time."
    };
  }

  return {
    tracked: true,
    isFree: false,
    isFirstInLine: false,
    queuePosition: null,
    nextQueuePosition: queue.length + 1,
    activeReservations: queue.length,
    status: "reserved",
    message: "This table is currently reserved by an earlier booking."
  };
};

const buildTableAvailability = ({ dateKey, timeSlot, tableLabel }, tableQueues) => {
  const key = getTableQueueKey({ dateKey, timeSlot, tableLabel });
  if (!key) {
    return createEmptyTableMonitor("Enter a table name to monitor availability.");
  }

  const queue = tableQueues.get(key) || [];
  if (!queue.length) {
    return {
      tracked: true,
      isFree: true,
      isFirstInLine: false,
      queuePosition: null,
      nextQueuePosition: 1,
      activeReservations: 0,
      status: "free",
      message: "This table is currently free for the selected date and time."
    };
  }

  const nextQueuePosition = queue.length + 1;

  return {
    tracked: true,
    isFree: false,
    isFirstInLine: false,
    queuePosition: null,
    nextQueuePosition,
    activeReservations: queue.length,
    status: "reserved",
    message: `This table already has ${queue.length} active reservation${queue.length === 1 ? "" : "s"} for that time slot. A new booking would be placed at #${nextQueuePosition}.`
  };
};

const mapReservation = (reservation, tableMonitor = createEmptyTableMonitor()) => ({
  id: reservation.reference,
  reference: reservation.reference,
  date: reservation.dateLabel,
  dateKey: reservation.dateKey,
  time: formatReservationTime(reservation.timeSlot),
  timeSlot: reservation.timeSlot,
  items: reservation.items.map((item) => ({
    name: item.name,
    qty: item.qty,
    price: item.price
  })),
  user: reservation.user && typeof reservation.user === "object"
    ? {
        id: String(reservation.user._id || reservation.user.id || ""),
        name: reservation.user.name || "",
        email: reservation.user.email || ""
      }
    : null,
  customer: {
    name: reservation.customer.name,
    email: reservation.customer.email,
    phone: reservation.customer.phone
  },
  partySize: Number(reservation.partySize || 1),
  tableLabel: reservation.tableLabel || "",
  total: reservation.total,
  status: reservation.status,
  notes: reservation.notes || "",
  arrivedAt: reservation.arrivedAt || null,
  tableMonitor,
  createdAt: reservation.createdAt,
  updatedAt: reservation.updatedAt
});

const mapReservationsWithTableMonitor = async (reservations) => {
  const tableQueues = await getActiveTableQueues(getSlotFilters(reservations));
  return reservations.map((reservation) => mapReservation(reservation, buildTableMonitor(reservation, tableQueues)));
};

const getNextReference = async (dateKey) => {
  const compactDate = dateKey.replace(/-/g, "");
  const latest = await Reservation.findOne({ dateKey })
    .sort({ reference: -1 })
    .select("reference")
    .lean();

  const lastSequence = latest?.reference ? Number(latest.reference.split("-").pop()) : 0;
  const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;
  return `RES-${compactDate}-${String(nextSequence).padStart(3, "0")}`;
};

export const getReservations = async (req, res) => {
  try {
    const filter = req.user.role === "admin" || req.user.role === "staff"
      ? {}
      : { user: req.user._id };
    const reservations = await Reservation.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .lean();

    res.json(await mapReservationsWithTableMonitor(reservations));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getReservationTableStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const dateKey = String(req.query.date || "").trim();
    const timeSlot = String(req.query.time || "").trim();
    const tableLabel = String(req.query.tableLabel || "").trim();
    const tableQueues = await getActiveTableQueues(dateKey && timeSlot ? [{ dateKey, timeSlot }] : []);

    res.json({
      dateKey,
      timeSlot,
      tableLabel,
      tableMonitor: buildTableAvailability({ dateKey, timeSlot, tableLabel }, tableQueues)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createReservation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      date,
      time,
      items,
      customer,
      notes = "",
      partySize = 1,
      tableLabel = ""
    } = req.body;
    const uniqueIds = [...new Set(items.map((item) => item.productId))];
    const products = await Product.find({
      _id: { $in: uniqueIds },
      isArchived: { $ne: true },
      isActive: true
    }).lean();

    if (products.length !== uniqueIds.length) {
      return res.status(400).json({ message: "One or more selected items are unavailable" });
    }

    const productsById = new Map(products.map((product) => [String(product._id), product]));
    const reservationItems = items.map((item) => {
      const product = productsById.get(String(item.productId));
      const unitPrice = product.discountPrice ?? product.price;

      return {
        product: product._id,
        name: product.name,
        qty: item.qty,
        price: unitPrice
      };
    });

    const total = reservationItems.reduce((sum, item) => sum + item.qty * item.price, 0);
    const dateLabel = formatReservationDate(date);
    const reference = await getNextReference(date);

    const reservation = await Reservation.create({
      reference,
      user: req.user._id,
      dateKey: date,
      dateLabel,
      timeSlot: time,
      items: reservationItems,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim()
      },
      partySize: Math.max(1, Number(partySize) || 1),
      tableLabel: String(tableLabel || "").trim(),
      notes: notes.trim(),
      total
    });

    const [mappedReservation] = await mapReservationsWithTableMonitor([reservation.toObject()]);

    res.status(201).json({
      ok: true,
      id: reference,
      reservation: mappedReservation
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A reservation for that reference already exists. Please try again." });
    }
    res.status(500).json({ message: err.message });
  }
};

export const updateReservationStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const reservation = await Reservation.findOne({ reference: req.params.id }).populate("user", "name email");

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const nextStatus = String(req.body.status || "").toLowerCase();
    const allowedStatuses = getStatusOptions(reservation.status);

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({
        message: allowedStatuses.length
          ? `Invalid reservation status transition. Allowed next statuses: ${allowedStatuses.join(", ")}`
          : "This reservation can no longer be updated"
      });
    }

    reservation.status = nextStatus;

    if (nextStatus === "arrived") {
      reservation.arrivedAt = reservation.arrivedAt || new Date();
    }

    if (nextStatus === "cancelled" && req.body.reason) {
      reservation.notes = [reservation.notes, `Cancellation: ${String(req.body.reason).trim()}`]
        .filter(Boolean)
        .join(" | ");
    }

    await reservation.save();

    const [mappedReservation] = await mapReservationsWithTableMonitor([reservation.toObject()]);

    res.json(mappedReservation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
