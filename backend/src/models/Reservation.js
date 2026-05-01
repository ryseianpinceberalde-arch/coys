import mongoose from "mongoose";

const reservationItemSchema = new mongoose.Schema(
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
    qty: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const reservationCustomerSchema = new mongoose.Schema(
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
    }
  },
  { _id: false }
);

const reservationSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    dateKey: {
      type: String,
      required: true,
      index: true
    },
    dateLabel: {
      type: String,
      required: true
    },
    timeSlot: {
      type: String,
      required: true
    },
    items: {
      type: [reservationItemSchema],
      validate: [(items) => items.length > 0, "Reservation must include at least one item"]
    },
    customer: {
      type: reservationCustomerSchema,
      required: true
    },
    partySize: {
      type: Number,
      default: 1,
      min: 1
    },
    tableLabel: {
      type: String,
      default: "",
      trim: true
    },
    notes: {
      type: String,
      default: "",
      trim: true
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "arrived", "completed", "cancelled"],
      default: "pending"
    },
    arrivedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
