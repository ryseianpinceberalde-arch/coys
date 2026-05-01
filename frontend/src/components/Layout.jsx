import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useOrderAlerts } from "../context/OrderAlertsContext.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import { hasStaffPermission } from "../utils/staffPermissions.js";

const NAV = {
  admin: [
    { to: "/admin", icon: "\uD83D\uDCCA", label: "Dashboard" },
    { to: "/pos", icon: "\uD83D\uDED2", label: "POS" },
    { to: "/orders", icon: "\uD83D\uDCE6", label: "Orders" },
    { to: "/reservations", icon: "\uD83C\uDF7D\uFE0F", label: "Reservations" },
    { to: "/transactions", icon: "\uD83E\uDDFE", label: "History" },
    { to: "/products", icon: "\uD83C\uDF7D\uFE0F", label: "Products" },
    { to: "/categories", icon: "\uD83C\uDFF7\uFE0F", label: "Categories" },
    { to: "/brands", icon: "\uD83C\uDFEA", label: "Brands" },
    { to: "/inventory", icon: "\uD83D\uDCE6", label: "Inventory" },
    { to: "/suppliers", icon: "\uD83D\uDE9A", label: "Suppliers" },
    { to: "/users", icon: "\uD83D\uDC65", label: "Users" },
    { to: "/reports", icon: "\uD83D\uDCC8", label: "Reports" },
    { to: "/archive", icon: "\uD83D\uDDD1\uFE0F", label: "Archive" },
    { to: "/settings", icon: "\u2699\uFE0F", label: "Settings" },
  ],
  staff: [
    { to: "/staff", icon: "\uD83D\uDCCA", label: "Dashboard", permission: "dashboard" },
    { to: "/pos", icon: "\uD83D\uDED2", label: "POS" },
    { to: "/orders", icon: "\uD83D\uDCE6", label: "Orders", permission: "orders" },
    { to: "/reservations", icon: "\uD83C\uDF7D\uFE0F", label: "Reservations" },
    { to: "/transactions", icon: "\uD83E\uDDFE", label: "History" },
    { to: "/users", icon: "\uD83D\uDC64", label: "Customers", permission: "customers" },
    { to: "/reports", icon: "\uD83D\uDCC8", label: "Reports", permission: "reports" },
    { to: "/archive", icon: "\uD83D\uDDD1\uFE0F", label: "Archive", permission: "archive" },
    { to: "/settings", icon: "\u2699\uFE0F", label: "Settings", permission: "settings" },
  ],
  user: [
    { to: "/user", icon: "\uD83C\uDFE0", label: "Dashboard" },
    { to: "/menu", icon: "\uD83C\uDF7D\uFE0F", label: "Browse Menu" },
  ],
};

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { unreadOrdersCount } = useOrderAlerts();
  const { pathname } = useLocation();
  const { settings } = useSettings();
  const hasLogo = Boolean(settings?.logoUrl);
  const links = ((user && NAV[user.role]) || []).filter((link) => hasStaffPermission(user, link.permission));

  const isActive = (to) =>
    to === "/admin" || to === "/staff" || to === "/user"
      ? pathname === to
      : pathname.startsWith(to);

  const initials = user?.name
    ? user.name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const roleLabel = { admin: "Admin", staff: "Staff", user: "Customer" };
  const roleBadgeColor = { admin: "#ef4444", staff: "#3b82f6", user: "#22c55e" };

  return (
    <div className="layout">
      <aside className="sidebar">
        <Link to="/" className="logo" style={{ textDecoration: "none" }}>
          <div className={`logo-icon${hasLogo ? " logo-icon--image" : ""}`} style={{ overflow: "hidden", borderRadius: hasLogo ? "0.5rem" : undefined }}>
            {hasLogo
              ? <img src={settings.logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : "\uD83C\uDF7D\uFE0F"
            }
          </div>
          <span className="logo-text">{settings?.name || "Coy's Corner"}</span>
        </Link>

        {user && (
          <>
            <span className="sidebar-section">Navigation</span>
            <nav>
              {links.map(({ to, icon, label }) => {
                const showOrdersBadge = to === "/orders" && unreadOrdersCount > 0;

                return (
                  <Link key={to} to={to} className={isActive(to) ? "active" : ""}>
                    <span>{icon}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                      {label}
                      {showOrdersBadge ? (
                        <span
                          style={{
                            minWidth: "1.35rem",
                            height: "1.35rem",
                            padding: "0 0.35rem",
                            borderRadius: "999px",
                            background: "#ef4444",
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            lineHeight: 1
                          }}
                        >
                          {unreadOrdersCount > 99 ? "99+" : unreadOrdersCount}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
              <Link to="/profile" className={pathname === "/profile" ? "active" : ""}>
                <span>{"\uD83D\uDC64"}</span>
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
              <span>{"\uD83D\uDEAA"}</span> Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">
            {[...links, { to: "/profile", label: "Profile" }]
              .find((link) => isActive(link.to))?.label ?? "Coy's Corner"}
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
