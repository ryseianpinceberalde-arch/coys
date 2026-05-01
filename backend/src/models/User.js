import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { DEFAULT_STAFF_PERMISSIONS } from "../utils/staffPermissions.js";

const staffPermissionSchema = new mongoose.Schema(
  {
    dashboard: { type: Boolean, default: DEFAULT_STAFF_PERMISSIONS.dashboard },
    orders: { type: Boolean, default: DEFAULT_STAFF_PERMISSIONS.orders },
    customers: { type: Boolean, default: DEFAULT_STAFF_PERMISSIONS.customers },
    reports: { type: Boolean, default: DEFAULT_STAFF_PERMISSIONS.reports },
    archive: { type: Boolean, default: DEFAULT_STAFF_PERMISSIONS.archive },
    settings: { type: Boolean, default: DEFAULT_STAFF_PERMISSIONS.settings }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
      select: false
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ["admin", "staff", "user"],
      default: "user"
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date,
      default: null
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    archiveReason: {
      type: String,
      default: ""
    },
    staffPermissions: {
      type: staffPermissionSchema,
      default: () => ({ ...DEFAULT_STAFF_PERMISSIONS })
    },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    avatar: { type: String, default: "" },
    lastLogin: { type: Date },
    loyaltyPoints: { type: Number, default: 0 }
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
