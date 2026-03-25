import StoreSettings from "../models/StoreSettings.js";

const getOrCreate = async () => {
  let s = await StoreSettings.findOne();
  if (!s) s = await StoreSettings.create({});
  return s;
};

export const getSettings = async (req, res) => {
  try {
    res.json(await getOrCreate());
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
