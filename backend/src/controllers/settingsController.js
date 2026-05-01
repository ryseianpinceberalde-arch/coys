import mongoose from "mongoose";
import StoreSettings from "../models/StoreSettings.js";
import {
  getMerchantEnabledPayMongoMethods,
  getConfiguredPayMongoPaymentMethods,
  isPayMongoConfigured
} from "../utils/paymongo.js";

const getOrCreate = async () => {
  let s = await StoreSettings.findOne();
  if (!s) s = await StoreSettings.create({});
  return s;
};

const normalizeStoreName = (value) => {
  const trimmed = String(value || "").trim();
  return !trimmed || trimmed.toLowerCase() === "my store" ? "Coy's Corner" : trimmed;
};

const getCheckoutPaymentMethods = async () => {
  const methods = ["cash"];

  if (isPayMongoConfigured()) {
    try {
      const configuredMethods = getConfiguredPayMongoPaymentMethods({ appVisibleOnly: true });
      const enabledMethods = await getMerchantEnabledPayMongoMethods({ appVisibleOnly: true });
      methods.push(...configuredMethods.filter((method) => enabledMethods.includes(method)));
    } catch (error) {
      console.error("[PayMongo] Unable to load enabled checkout methods for settings:", error.message);
    }
  }

  if (String(process.env.STRIPE_SECRET_KEY || "").trim()) {
    methods.push("stripe");
  }

  return [...new Set(methods)];
};

const normalizeBackupFilenamePart = (value) => {
  const cleaned = String(value || "database")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "database";
};

export const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreate();
    const paymentMethods = await getCheckoutPaymentMethods();
    res.json({
      ...settings.toObject(),
      name: normalizeStoreName(settings.name),
      paymentMethods
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPublicSettings = async (_req, res) => {
  try {
    const settings = await getOrCreate();
    const paymentMethods = await getCheckoutPaymentMethods();
    res.json({
      name: normalizeStoreName(settings.name),
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      currency: settings.currency,
      taxRate: settings.taxRate,
      receiptFooter: settings.receiptFooter,
      logoUrl: settings.logoUrl,
      paymentMethods
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await getOrCreate();

    const fields = ["name", "address", "phone", "email", "currency", "receiptFooter"];
    fields.forEach(f => { if (req.body[f] !== undefined) settings[f] = req.body[f]; });

    if (req.body.taxRate !== undefined) settings.taxRate = parseFloat(req.body.taxRate) || 0;

    // Logo uploaded via multipart
    if (req.file) settings.logoUrl = `/uploads/logo/${req.file.filename}`;
    // Explicit clear
    if (req.body.logoUrl === "") settings.logoUrl = "";

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const downloadDatabaseBackup = async (req, res) => {
  try {
    const db = mongoose.connection?.db;

    if (!db) {
      return res.status(503).json({ message: "Database connection unavailable" });
    }

    const collectionInfos = await db.listCollections({}, { nameOnly: true }).toArray();
    const collectionNames = collectionInfos
      .map((entry) => entry.name)
      .filter((name) => name && !name.startsWith("system."))
      .sort((a, b) => a.localeCompare(b));

    const collectionEntries = await Promise.all(
      collectionNames.map(async (name) => {
        const documents = await db.collection(name).find({}).toArray();
        return [name, documents];
      })
    );

    const exportedAt = new Date().toISOString();
    const filename = `${normalizeBackupFilenamePart(db.databaseName)}-backup-${exportedAt.slice(0, 10)}.json`;
    const collections = Object.fromEntries(collectionEntries);
    const counts = Object.fromEntries(collectionEntries.map(([name, documents]) => [name, documents.length]));
    const payload = {
      exportedAt,
      database: db.databaseName,
      exportedBy: {
        id: String(req.user?._id || ""),
        email: req.user?.email || "",
        role: req.user?.role || ""
      },
      collectionCount: collectionNames.length,
      documentCounts: counts,
      collections
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
