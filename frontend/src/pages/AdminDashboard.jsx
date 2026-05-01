import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import SimpleChart from "../components/SimpleChart.jsx";
import api from "../utils/api";

const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/admin")
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text3)" }}>Loading dashboard…</div>
      </Layout>
    );
  }

  const statCards = [
    { icon: "🛒", label: "Today's Sales", value: data?.today?.sales ?? 0, color: "card-accent" },
    { icon: "💰", label: "Today's Revenue", value: fmt(data?.today?.revenue), color: "card-green" },
    { icon: "📅", label: "This Month Revenue", value: fmt(data?.month?.revenue), color: "card-blue" },
    { icon: "🍽️", label: "Total Products", value: data?.totalProducts ?? 0, color: "card-accent" },
    { icon: "👥", label: "Registered Users", value: data?.totalUsers ?? 0, color: "card-green" },
    {
      icon: "⚠️",
      label: "Low Stock Items",
      value: (data?.lowStockCount ?? 0) + (data?.outOfStockCount ?? 0),
      color: ((data?.lowStockCount ?? 0) + (data?.outOfStockCount ?? 0)) > 0 ? "card-red" : "card-green"
    }
  ];

  return (
    <Layout>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h1>Admin Dashboard</h1>
          <p className="text-muted">{dateStr}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <Link to="/pos" className="btn primary" style={{ textDecoration: "none" }}>🛒 Open POS</Link>
        <Link to="/products" className="btn btn-ghost" style={{ textDecoration: "none" }}>🍽️ Products</Link>
        <Link to="/users" className="btn btn-ghost" style={{ textDecoration: "none" }}>👥 Users</Link>
        <Link to="/reports" className="btn btn-ghost" style={{ textDecoration: "none" }}>📈 Reports</Link>
      </div>

      {/* Stat Cards */}
      <div className="card-grid stagger" style={{ marginBottom: "2rem" }}>
        {statCards.map((card, i) => (
          <div key={i} className="stat-card">
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{card.icon}</div>
            <div className="card-label">{card.label}</div>
            <div className={`card-value ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="section" style={{ marginBottom: "2rem" }}>
        <h2>Sales — Last 7 Days</h2>
        <SimpleChart data={data?.chartData || []} />
      </div>

      {/* Two columns */}
      <div className="grid-2" style={{ alignItems: "start", marginBottom: "2rem" }}>
        {/* Top Products */}
        <div className="section">
          <h2>Top Products</h2>
          {!data?.topProducts?.length ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
              <p>No sales data yet</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>#</th><th>Product</th><th>Units Sold</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--text3)", fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td><span className="badge badge-blue">{p.totalQty}</span></td>
                      <td style={{ color: "var(--green)", fontWeight: 600 }}>{fmt(p.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="section">
          <h2>Recent History</h2>
          {!data?.recentTransactions?.length ? (
            <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🧾</div>
              <p>No history yet</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Invoice</th><th>Time</th><th>Cashier</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map(t => (
                    <tr key={t._id}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--accent)" }}>{t.invoiceNumber || "—"}</td>
                      <td style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{timeAgo(t.createdAt)}</td>
                      <td style={{ color: "var(--text2)" }}>{t.cashier?.name || "—"}</td>
                      <td style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(t.total)}</td>
                      <td>
                        <span className={`badge ${t.status === "completed" ? "badge-green" : t.status === "cancelled" ? "badge-red" : "badge-amber"}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {data?.lowStockProducts?.length > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "var(--radius)",
          padding: "1.25rem"
        }}>
          <h3 style={{ color: "var(--amber)", marginBottom: "0.75rem" }}>⚠️ Low Stock Alert</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {data.lowStockProducts.map(p => (
              <div key={p._id} style={{
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: "var(--radius-sm)",
                padding: "0.35rem 0.75rem",
                fontSize: "0.82rem"
              }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: "var(--amber)", marginLeft: "0.5rem" }}>{p.stockQuantity} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;
