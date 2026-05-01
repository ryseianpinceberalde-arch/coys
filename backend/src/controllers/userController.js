import { validationResult } from "express-validator";
import User from "../models/User.js";
import { archiveDocument } from "../utils/archive.js";
import { normalizeStaffPermissions } from "../utils/staffPermissions.js";

// Admin sees all users; staff sees only role=user accounts
export const getUsers = async (req, res) => {
  const filter = req.user.role === "admin"
    ? { isArchived: { $ne: true } }
    : { role: "user", isArchived: { $ne: true } };
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  res.json(users);
};

// Admin can create any role; staff can only create role=user
export const createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, staffPermissions } = req.body;
  const nextRole = role || "user";

  // Staff cannot create admin or staff accounts
  if (req.user.role === "staff" && nextRole !== "user") {
    return res.status(403).json({ message: "Staff can only create customer accounts" });
  }

  const exists = await User.findOne({ email, isArchived: { $ne: true } });
  if (exists) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: nextRole,
    ...(req.user.role === "admin" && nextRole === "staff"
      ? { staffPermissions: normalizeStaffPermissions(staffPermissions) }
      : {})
  });

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    staffPermissions: user.staffPermissions
  });
};

// Admin can update anyone; staff can only update role=user accounts
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, isActive, staffPermissions } = req.body;

  const user = await User.findById(id);
  if (!user || user.isArchived) return res.status(404).json({ message: "User not found" });

  // Staff cannot modify admin or staff accounts
  if (req.user.role === "staff" && user.role !== "user") {
    return res.status(403).json({ message: "Staff can only manage customer accounts" });
  }

  // Staff cannot change a user's role to admin/staff
  if (req.user.role === "staff" && role && role !== "user") {
    return res.status(403).json({ message: "Staff cannot assign admin or staff roles" });
  }

  user.name = name ?? user.name;
  user.email = email ?? user.email;
  const nextRole = req.user.role === "admin" ? (role ?? user.role) : user.role;
  if (req.user.role === "admin") user.role = nextRole;
  if (typeof isActive === "boolean") user.isActive = isActive;
  if (req.user.role === "admin") {
    user.staffPermissions = nextRole === "staff"
      ? normalizeStaffPermissions(staffPermissions ?? user.staffPermissions)
      : normalizeStaffPermissions(user.staffPermissions);
  }

  await user.save();

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    staffPermissions: user.staffPermissions
  });
};

// Only admin can delete (enforced at route level too)
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user || user.isArchived) return res.status(404).json({ message: "User not found" });
  await archiveDocument({
    doc: user,
    entityType: "user",
    deletedBy: req.user,
    reason: req.body?.reason
  });
  res.json({ message: "User moved to archive" });
};
