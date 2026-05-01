import { randomInt, randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import RegistrationOtp from "../models/RegistrationOtp.js";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { sendRegistrationOtpEmail } from "../utils/email.js";
import { verifyFacebookAccessToken } from "../utils/facebookAuth.js";
import { verifyGoogleIdToken } from "../utils/googleAuth.js";
import { normalizeStaffPermissions } from "../utils/staffPermissions.js";

const OTP_LENGTH = 6;
const REGISTRATION_OTP_EXPIRES_MINUTES = Number(process.env.REGISTRATION_OTP_EXPIRES_MINUTES || 10);
const REGISTRATION_OTP_RESEND_SECONDS = Number(process.env.REGISTRATION_OTP_RESEND_SECONDS || 60);
const REGISTRATION_OTP_MAX_ATTEMPTS = Number(process.env.REGISTRATION_OTP_MAX_ATTEMPTS || 5);
const LOGIN_RATE_LIMIT_WINDOW_MS = Math.max(Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000, 1000);
const LOGIN_RATE_LIMIT_PRIVILEGED_MAX_ATTEMPTS = Math.max(
  Number(process.env.LOGIN_RATE_LIMIT_PRIVILEGED_MAX_ATTEMPTS) || 5,
  1
);
const LOGIN_RATE_LIMIT_USER_MAX_ATTEMPTS = Math.max(
  Number(process.env.LOGIN_RATE_LIMIT_USER_MAX_ATTEMPTS) || 10,
  1
);
const loginAttemptStore = new Map();

const serializeAuthUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  role: user.role,
  avatar: user.avatar,
  staffPermissions: normalizeStaffPermissions(user.staffPermissions)
});

const sendAuthResponse = (res, user, statusCode = 200) => {
  const token = generateToken(user);

  res.status(statusCode).json({
    token,
    user: serializeAuthUser(user)
  });
};

const buildFacebookUserLookup = (facebookProfile) => {
  const lookup = [{ facebookId: facebookProfile.facebookId }];

  if (facebookProfile.email) {
    lookup.push({ email: facebookProfile.email });
  }

  return lookup;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const createRegistrationOtp = () =>
  randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");

const getOtpExpiry = () =>
  new Date(Date.now() + REGISTRATION_OTP_EXPIRES_MINUTES * 60 * 1000);

const pruneExpiredLoginAttempts = (now = Date.now()) => {
  for (const [key, entry] of loginAttemptStore.entries()) {
    if (entry.expiresAt <= now) {
      loginAttemptStore.delete(key);
    }
  }
};

const getLoginAttemptLimit = (role) =>
  role === "user"
    ? LOGIN_RATE_LIMIT_USER_MAX_ATTEMPTS
    : LOGIN_RATE_LIMIT_PRIVILEGED_MAX_ATTEMPTS;

const getRequestIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
};

const getLoginAttemptKey = (req, email) => `${getRequestIp(req)}:${email || "unknown"}`;

const getLoginAttemptState = (req, email, role, now = Date.now()) => {
  pruneExpiredLoginAttempts(now);

  const key = getLoginAttemptKey(req, email);
  const limit = getLoginAttemptLimit(role);
  const existingEntry = loginAttemptStore.get(key);
  const entry = existingEntry && existingEntry.expiresAt > now
    ? existingEntry
    : { count: 0, expiresAt: now + LOGIN_RATE_LIMIT_WINDOW_MS };

  if (!existingEntry || existingEntry.expiresAt <= now) {
    loginAttemptStore.set(key, entry);
  }

  return {
    key,
    limit,
    entry,
    retryAfterSeconds: Math.max(Math.ceil((entry.expiresAt - now) / 1000), 1)
  };
};

const sendLoginRateLimitResponse = (res, retryAfterSeconds) => {
  res.set("Retry-After", String(retryAfterSeconds));
  return res.status(429).json({
    message: `Too many login attempts. Please wait ${retryAfterSeconds} seconds before trying again.`,
    retryAfterSeconds
  });
};

export const requestRegistrationOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const email = normalizeEmail(req.body.email);

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const existingOtp = await RegistrationOtp.findOne({ email });
  if (existingOtp?.lastSentAt) {
    const secondsSinceLastSend = (Date.now() - existingOtp.lastSentAt.getTime()) / 1000;
    if (secondsSinceLastSend < REGISTRATION_OTP_RESEND_SECONDS) {
      const retryAfterSeconds = Math.ceil(REGISTRATION_OTP_RESEND_SECONDS - secondsSinceLastSend);
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds} seconds before requesting another OTP`,
        retryAfterSeconds
      });
    }
  }

  const otp = createRegistrationOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  await RegistrationOtp.findOneAndUpdate(
    { email },
    {
      email,
      otpHash,
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: getOtpExpiry()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await sendRegistrationOtpEmail({
      to: email,
      otp,
      expiresInMinutes: REGISTRATION_OTP_EXPIRES_MINUTES
    });

    return res.json({
      message: "Registration OTP sent to your email",
      expiresInMinutes: REGISTRATION_OTP_EXPIRES_MINUTES
    });
  } catch (error) {
    await RegistrationOtp.deleteOne({ email });
    return res.status(error.statusCode || 500).json({
      message: error.message || "Unable to send registration OTP"
    });
  }
};

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, password, phone = "" } = req.body;
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const otpRecord = await RegistrationOtp.findOne({ email });
  if (!otpRecord || otpRecord.expiresAt.getTime() <= Date.now()) {
    await RegistrationOtp.deleteOne({ email });
    return res.status(400).json({ message: "OTP expired. Please request a new code." });
  }

  if (otpRecord.attempts >= REGISTRATION_OTP_MAX_ATTEMPTS) {
    await RegistrationOtp.deleteOne({ email });
    return res.status(429).json({ message: "Too many OTP attempts. Please request a new code." });
  }

  const isOtpMatch = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isOtpMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    const remainingAttempts = Math.max(REGISTRATION_OTP_MAX_ATTEMPTS - otpRecord.attempts, 0);
    if (!remainingAttempts) {
      await RegistrationOtp.deleteOne({ email });
      return res.status(429).json({ message: "Too many OTP attempts. Please request a new code." });
    }

    return res.status(400).json({
      message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
    });
  }

  const user = await User.create({ name, email, password, phone, role: "user" });
  await RegistrationOtp.deleteOne({ email });
  return sendAuthResponse(res, user, 201);
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  const user = await User.findOne({ email });
  const loginAttemptState = getLoginAttemptState(req, email, user?.role);
  if (loginAttemptState.entry.count >= loginAttemptState.limit) {
    return sendLoginRateLimitResponse(res, loginAttemptState.retryAfterSeconds);
  }

  if (!user || !user.isActive || user.isArchived) {
    loginAttemptState.entry.count += 1;

    if (loginAttemptState.entry.count >= loginAttemptState.limit) {
      return sendLoginRateLimitResponse(res, loginAttemptState.retryAfterSeconds);
    }

    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    loginAttemptState.entry.count += 1;

    if (loginAttemptState.entry.count >= loginAttemptState.limit) {
      return sendLoginRateLimitResponse(res, loginAttemptState.retryAfterSeconds);
    }

    return res.status(401).json({ message: "Invalid credentials" });
  }

  loginAttemptStore.delete(loginAttemptState.key);
  user.lastLogin = new Date();
  await user.save();

  return sendAuthResponse(res, user);
};

export const loginWithGoogle = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const googleProfile = await verifyGoogleIdToken(req.body.credential);
    let user = await User.findOne({
      $or: [{ googleId: googleProfile.googleId }, { email: googleProfile.email }]
    }).select("+googleId");

    if (user) {
      if (!user.isActive || user.isArchived) {
        return res.status(403).json({ message: "This account is inactive" });
      }

      if (user.role !== "user") {
        return res.status(403).json({ message: "Google sign-in is only available for customer accounts" });
      }

      if (user.googleId && user.googleId !== googleProfile.googleId) {
        return res.status(409).json({ message: "This email is already linked to a different Google account" });
      }

      if (!user.googleId) {
        user.googleId = googleProfile.googleId;
      }

      if (!user.avatar && googleProfile.avatar) {
        user.avatar = googleProfile.avatar;
      }

      if (!user.name && googleProfile.name) {
        user.name = googleProfile.name;
      }
    } else {
      user = new User({
        name: googleProfile.name,
        email: googleProfile.email,
        googleId: googleProfile.googleId,
        password: `${randomUUID()}${randomUUID()}`,
        avatar: googleProfile.avatar,
        role: "user"
      });
    }

    user.lastLogin = new Date();
    await user.save();

    return sendAuthResponse(res, user);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Google sign-in failed"
    });
  }
};

export const loginWithFacebook = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const facebookProfile = await verifyFacebookAccessToken(req.body.accessToken);
    let user = await User.findOne({
      $or: buildFacebookUserLookup(facebookProfile)
    }).select("+facebookId");

    if (user) {
      if (!user.isActive || user.isArchived) {
        return res.status(403).json({ message: "This account is inactive" });
      }

      if (user.role !== "user") {
        return res.status(403).json({ message: "Facebook sign-in is only available for customer accounts" });
      }

      if (user.facebookId && user.facebookId !== facebookProfile.facebookId) {
        return res.status(409).json({ message: "This email is already linked to a different Facebook account" });
      }

      if (!user.facebookId) {
        user.facebookId = facebookProfile.facebookId;
      }

      if (!user.avatar && facebookProfile.avatar) {
        user.avatar = facebookProfile.avatar;
      }

      if (!user.name && facebookProfile.name) {
        user.name = facebookProfile.name;
      }
    } else {
      user = new User({
        name: facebookProfile.name,
        email: facebookProfile.email || facebookProfile.fallbackEmail,
        facebookId: facebookProfile.facebookId,
        password: `${randomUUID()}${randomUUID()}`,
        avatar: facebookProfile.avatar,
        role: "user"
      });
    }

    user.lastLogin = new Date();
    await user.save();

    return sendAuthResponse(res, user);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Facebook sign-in failed"
    });
  }
};

export const getMe = async (req, res) => {
  res.json(serializeAuthUser(req.user));
};

export const updateMe = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);

    if (!user || !user.isActive) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, phone, address } = req.body;

    if (name !== undefined) {
      user.name = String(name).trim();
    }

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    if (address !== undefined) {
      user.address = String(address).trim();
    }

    await user.save();

    res.json(serializeAuthUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
