import mongoose from "mongoose";

const storeSettingsSchema = new mongoose.Schema(
  {
    name:          { type: String, default: "Coy's Corner" },
    address:       { type: String, default: "" },
    phone:         { type: String, default: "" },
    email:         { type: String, default: "" },
    currency:      { type: String, default: "PHP" },
    taxRate:       { type: Number, default: 0 },
    receiptFooter: { type: String, default: "Thank you for your purchase!" },
    logoUrl:       { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("StoreSettings", storeSettingsSchema);
