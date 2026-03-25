import { validationResult } from "express-validator";
import User from "../models/User.js";

// Admin sees all users; staff sees only role=user accounts
export const getUsers = async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { role: "user" };
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  res.json(users);
};

// Admin can create any role; staff can only create role=user
export const createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role } = req.body;

  // Staff cannot create admin or staff accounts
  if (req.user.role === "staff" && role !== "user") {
    return res.status(403).json({ message: "Staff can only create customer accounts" });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const user = await User.create({ name, email, password, role });

  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  });
};

// Admin can update anyone; staff can only update role=user accounts
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, isActive } = req.body;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });

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
  if (req.user.role === "admin") user.role = role ?? user.role;
  if (typeof isActive === "boolean") user.isActive = isActive;

  await user.save();

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  });
};

// Only admin can delete (enforced at route level too)
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found" });
  await user.deleteOne();
  res.json({ message: "User removed" });
};
