import mongoose from "mongoose";

const registrationOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    otpHash: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastSentAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

registrationOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RegistrationOtp = mongoose.model("RegistrationOtp", registrationOtpSchema);

export default RegistrationOtp;
