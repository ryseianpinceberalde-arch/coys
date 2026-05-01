import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      default: ""
    },
    imageUrl: {
      type: String,
      default: ""
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const orderCustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      default: "",
      trim: true
    }
  },
  { _id: false }
);

const orderTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"],
      required: true
    },
    note: {
      type: String,
      default: "",
      trim: true
    },
    actorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    actorName: {
      type: String,
      default: "",
      trim: true
    },
    actorRole: {
      type: String,
      default: "",
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    queueNumber: {
      type: Number,
      min: 1
    },
    customerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    customer: {
      type: orderCustomerSchema,
      required: true
    },
    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, "Order must include at least one item"]
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "gcash", "qrph", "card", "stripe"],
      default: "cash"
    },
    paymentProvider: {
      type: String,
      enum: ["manual", "paymongo", "stripe"],
      default: "manual"
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },
    paymentSessionId: {
      type: String,
      default: "",
      trim: true
    },
    paymentUrl: {
      type: String,
      default: "",
      trim: true
    },
    paymentPaidAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"],
      default: "pending",
      index: true
    },
    notes: {
      type: String,
      default: "",
      trim: true
    },
    cancelReason: {
      type: String,
      default: "",
      trim: true
    },
    completedAt: {
      type: Date,
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      default: null
    },
    source: {
      type: String,
      default: "mobile"
    },
    guestAccessToken: {
      type: String,
      default: "",
      select: false
    },
    timeline: {
      type: [orderTimelineSchema],
      default: []
    }
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerUser: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
