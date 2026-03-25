import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import SimpleChart from "../components/SimpleChart.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../utils/api";

const periodTabs = ["daily", "weekly", "monthly", "yearly"];

const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;

const ReportsPage = () => {
  const toast = useToast();
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState({ data: [], summary: null });
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const [salesRes, productsRes] = await Promise.all([
        api.get(`/reports/sales?${params.toString()}`),
        api.get(`/reports/products?limit=10${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`)
      ]);

      setReportData(salesRes.data);
      setTopProducts(productsRes.data);
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, toast]);

  useEffect(() => { load(); }, [period]);

  const handleApply = () => load();

  const chartData = (reportData.data || []).map(d => {
    let label = "";
    if (period === "daily") label = `${d._id.month}/${d._id.day}`;
    else if (period === "weekly") label = `W${d._id.week}`;
    else if (period === "yearly") label = `${d._id.year}`;
    else label = `${d._id.month}/${String(d._id.year).slice(2)}`;
    return { label, value: d.total };
  });

  const summary = reportData.summary;

  return (
    <Layout>
      <div className="page-header">
        <h1>Reports &amp; Analytics</h1>
        <p className="text-muted">Sales performance and insights</p>
      </div>

      {/* Period Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {periodTabs.map(tab => (
          <button
            key={tab}
            onClick={() => { setPeriod(tab); setStartDate(""); setEndDate(""); }}
            style={{
              padding: "0.45rem 1.1rem",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: period === tab ? "var(--accent)" : "var(--bg2)",
              color: period === tab ? "#fff" : "var(--text2)",
              cursor: "pointer",
              fontSize: "0.83rem",
              fontWeight: 600,
              fontFamily: "inherit",
              textTransform: "capitalize",
              transition: "all var(--transition)"
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Date Range Override */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text3)" }}>Date range:</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span style={{ color: "var(--text3)" }}>to</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <button className="btn btn-sm primary" onClick={handleApply}>Apply</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setStartDate(""); setEndDate(""); }}>Reset</button>
      </div>

      {/* Summary Cards */}
      <div className="card-grid stagger" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>💰</div>
          <div className="card-label">Total Revenue</div>
          <div className="card-value card-accent">{loading ? "—" : fmt(summary?.totalRevenue)}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🧾</div>
          <div className="card-label">Total Transactions</div>
          <div className="card-value card-green">{loading ? "—" : summary?.totalTransactions ?? 0}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📊</div>
          <div className="card-label">Avg. Order Value</div>
          <div className="card-value card-blue">{loading ? "—" : fmt(summary?.avgOrderValue)}</div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="section" style={{ marginBottom: "2rem" }}>
        <h2>Sales Chart — {period.charAt(0).toUpperCase() + period.slice(1)}</h2>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text3)" }}>Loading chart…</div>
        ) : (
          <SimpleChart data={chartData} />
        )}
      </div>

      {/* Top Products */}
      <div className="section" style={{ marginBottom: "2rem" }}>
        <h2>Top Products by Sales</h2>
        {loading ? (
          <div style={{ padding: "2rem", color: "var(--text3)" }}>Loading…</div>
        ) : topProducts.length === 0 ? (
          <div style={{ padding: "2rem", color: "var(--text3)", textAlign: "center" }}>No data available</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Product</th><th>Units Sold</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
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

      {/* Export */}
      <div className="section">
        <h2>Export Reports</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const p = new URLSearchParams();
              if (startDate) p.set("startDate", startDate);
              if (endDate) p.set("endDate", endDate);
              window.open(`/api/reports/csv?type=sales&${p.toString()}`, "_blank");
            }}
          >
            📊 Export Sales CSV
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => window.open("/api/reports/csv?type=products", "_blank")}
          >
            🍽️ Export Products CSV
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => window.open("/api/reports/csv?type=inventory", "_blank")}
          >
            📦 Export Inventory CSV
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;
