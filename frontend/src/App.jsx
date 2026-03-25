import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./state/AuthContext.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MenuPage from "./pages/MenuPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import StaffDashboard from "./pages/StaffDashboard.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import PosPage from "./pages/PosPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ReceiptPage from "./pages/ReceiptPage.jsx";
import BrandsPage from "./pages/BrandsPage.jsx";
import SuppliersPage from "./pages/SuppliersPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

/* Redirects unauthenticated users, optionally checks role */
const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="centered"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePath(user)} replace />;
  return children;
};

/* Returns the home path for a logged-in user */
const homePath = (user) => {
  if (!user) return "/";
  if (user.role === "admin") return "/admin";
  if (user.role === "staff") return "/staff";
  return "/user";
};

/* Smart home: show landing for guests, redirect logged-in to their dashboard */
const Home = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="centered"><div className="spinner" /></div>;
  if (user) return <Navigate to={homePath(user)} replace />;
  return <LandingPage />;
};

const App = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/"         element={<Home />} />
    <Route path="/menu"     element={<MenuPage />} />
    <Route path="/login"    element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Admin only */}
    <Route path="/admin"      element={<PrivateRoute roles={["admin"]}><AdminDashboard /></PrivateRoute>} />
    <Route path="/products"   element={<PrivateRoute roles={["admin"]}><ProductsPage /></PrivateRoute>} />
    <Route path="/categories" element={<PrivateRoute roles={["admin"]}><CategoriesPage /></PrivateRoute>} />
    <Route path="/reports"    element={<PrivateRoute roles={["admin"]}><ReportsPage /></PrivateRoute>} />
    <Route path="/inventory"  element={<PrivateRoute roles={["admin"]}><InventoryPage /></PrivateRoute>} />
    <Route path="/brands"     element={<PrivateRoute roles={["admin"]}><BrandsPage /></PrivateRoute>} />
    <Route path="/suppliers"  element={<PrivateRoute roles={["admin"]}><SuppliersPage /></PrivateRoute>} />
    <Route path="/settings"   element={<PrivateRoute roles={["admin"]}><SettingsPage /></PrivateRoute>} />

    {/* Admin + Staff */}
    <Route path="/staff"        element={<PrivateRoute roles={["staff", "admin"]}><StaffDashboard /></PrivateRoute>} />
    <Route path="/pos"          element={<PrivateRoute roles={["staff", "admin"]}><PosPage /></PrivateRoute>} />
    <Route path="/users"        element={<PrivateRoute roles={["staff", "admin"]}><UsersPage /></PrivateRoute>} />
    <Route path="/transactions" element={<PrivateRoute roles={["staff", "admin"]}><TransactionsPage /></PrivateRoute>} />
    <Route path="/receipt/:id"  element={<PrivateRoute roles={["staff", "admin"]}><ReceiptPage /></PrivateRoute>} />

    {/* All logged-in */}
    <Route path="/user"    element={<PrivateRoute roles={["user", "staff", "admin"]}><UserDashboard /></PrivateRoute>} />
    <Route path="/profile" element={<PrivateRoute roles={["admin", "staff", "user"]}><ProfilePage /></PrivateRoute>} />

    {/* Catch-all */}
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default App;
