import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import api from "../utils/api";

const fmt = (n) => `â‚±${Number(n || 0).toFixed(2)}`;

const StaffDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/staff")
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const recentSales = data?.recentSales || [];

  return (
    <Layout>
      <div className="page-header">
        <h1>Staff Dashboard</h1>
        <p className="text-muted">Your activity overview</p>
      </div>

      {/* Stat Cards */}
      <div className="card-grid stagger" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>ðŸ›’</div>
          <div className="card-label">Sales Today</div>
          <div className="card-value card-accent">{loading ? "â€”" : data?.today?.sales ?? 0}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>ðŸ’°</div>
          <div className="card-label">Revenue Today</div>
          <div className="card-value card-green">{loading ? "â€”" : fmt(data?.today?.revenue)}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>ðŸ§¾</div>
          <div className="card-label">All-Time Sales</div>
          <div className="card-value card-blue">{loading ? "â€”" : data?.allTime?.sales ?? 0}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>ðŸ“ˆ</div>
          <div className="card-label">All-Time Revenue</div>
          <div className="card-value card-accent">{loading ? "â€”" : fmt(data?.allTime?.revenue)}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <Link to="/pos" className="btn primary" style={{ textDecoration: "none" }}>
          ðŸ›’ Open POS
        </Link>
        <Link to="/orders" className="btn btn-ghost" style={{ textDecoration: "none" }}>
          ðŸ“¦ Queuing
        </Link>
        <Link to="/users" className="btn btn-ghost" style={{ textDecoration: "none" }}>
          ðŸ‘¤ Manage Customers
        </Link>
        <Link to="/transactions" className="btn btn-ghost" style={{ textDecoration: "none" }}>
          ðŸ§¾ History
        </Link>
      </div>

      {/* Recent History */}
      <div className="section">
        <h2>Recent History</h2>
        {loading ? (
          <div style={{ padding: "2rem", color: "var(--text3)" }}>Loadingâ€¦</div>
        ) : recentSales.length === 0 ? (
          <div className="card" style={{ color: "var(--text3)", textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>ðŸ§¾</div>
            <p>No history yet.</p>
            <Link to="/pos" className="btn primary" style={{ textDecoration: "none", marginTop: "1rem", display: "inline-flex" }}>
              Open POS â†’
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date &amp; Time</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map(s => (
                  <tr key={s._id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--accent)" }}>{s.invoiceNumber || "â€”"}</td>
                    <td style={{ color: "var(--text2)", fontSize: "0.82rem" }}>{new Date(s.createdAt).toLocaleString()}</td>
                    <td><span className="badge badge-blue">{s.items?.length || 0} items</span></td>
                    <td style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(s.total)}</td>
                    <td>
                      <span className={`badge ${s.status === "completed" ? "badge-green" : s.status === "cancelled" ? "badge-red" : "badge-amber"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StaffDashboard;
