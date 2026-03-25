import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

const NAV = {
  admin: [
    { to: "/admin",        icon: "📊", label: "Dashboard" },
    { to: "/pos",          icon: "🛒", label: "POS" },
    { to: "/transactions", icon: "🧾", label: "Transactions" },
    { to: "/products",     icon: "🍽️", label: "Products" },
    { to: "/categories",   icon: "🏷️", label: "Categories" },
    { to: "/brands",       icon: "🏪", label: "Brands" },
    { to: "/inventory",    icon: "📦", label: "Inventory" },
    { to: "/suppliers",    icon: "🚚", label: "Suppliers" },
    { to: "/users",        icon: "👥", label: "Users" },
    { to: "/reports",      icon: "📈", label: "Reports" },
    { to: "/settings",     icon: "⚙️", label: "Settings" },
  ],
  staff: [
    { to: "/staff",        icon: "📊", label: "Dashboard" },
    { to: "/pos",          icon: "🛒", label: "POS" },
    { to: "/transactions", icon: "🧾", label: "My Sales" },
    { to: "/users",        icon: "👤", label: "Customers" },
  ],
  user: [
    { to: "/user", icon: "🏠", label: "Dashboard" },
    { to: "/menu", icon: "🍽️", label: "Browse Menu" },
  ],
};

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { settings } = useSettings();
  const links = (user && NAV[user.role]) || [];

  const isActive = (to) =>
    to === "/admin" || to === "/staff" || to === "/user"
      ? pathname === to
      : pathname.startsWith(to);

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const roleLabel = { admin: "Admin", staff: "Staff", user: "Customer" };
  const roleBadgeColor = { admin: "#ef4444", staff: "#3b82f6", user: "#22c55e" };

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <Link to="/" className="logo" style={{ textDecoration: "none" }}>
          <div className="logo-icon" style={{ overflow: "hidden", borderRadius: settings?.logoUrl ? "0.5rem" : undefined }}>
            {settings?.logoUrl
              ? <img src={settings.logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "🍽️"
            }
          </div>
          <span className="logo-text">{settings?.name || "Coy's Corner"}</span>
        </Link>

        {user && (
          <>
            <span className="sidebar-section">Navigation</span>
            <nav>
              {links.map(({ to, icon, label }) => (
                <Link key={to} to={to} className={isActive(to) ? "active" : ""}>
                  <span>{icon}</span>
                  {label}
                </Link>
              ))}
              <Link to="/profile" className={pathname === "/profile" ? "active" : ""}>
                <span>👤</span>
                Profile
              </Link>
            </nav>
          </>
        )}

        <div className="sidebar-footer">
          {user && (
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm"
              style={{ width: "100%", borderRadius: "var(--radius-sm)", justifyContent: "center" }}
            >
              <span>🚪</span> Sign out
            </button>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        <header className="topbar">
          <span className="topbar-title">
            {[...links, { to: "/profile", label: "Profile" }]
              .find((l) => isActive(l.to))?.label ?? "Coy's Corner"}
          </span>

          <div className="topbar-right">
            {user && (
              <div className="topbar-user">
                <div className="topbar-avatar">{initials}</div>
                <span style={{ color: "var(--text)" }}>{user.name}</span>
                <span style={{
                  fontSize: "0.7rem",
                  padding: "0.15rem 0.55rem",
                  borderRadius: "999px",
                  background: `${roleBadgeColor[user.role]}22`,
                  color: roleBadgeColor[user.role],
                  border: `1px solid ${roleBadgeColor[user.role]}44`,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  {roleLabel[user.role] ?? user.role}
                </span>
              </div>
            )}
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
