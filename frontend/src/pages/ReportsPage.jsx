import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import SimpleChart from "../components/SimpleChart.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api, { downloadAuthenticatedFile } from "../utils/api";

const periodTabs = ["daily", "weekly", "monthly", "yearly"];

const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;

const ReportsPage = () => {
  const toast = useToast();
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [reportData, setReportData] = useState({ data: [], summary: null });
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const salesParams = new URLSearchParams({ period });
      const productParams = new URLSearchParams({ limit: "10", period });
      if (appliedStartDate) {
        salesParams.set("startDate", appliedStartDate);
        productParams.set("startDate", appliedStartDate);
      }
      if (appliedEndDate) {
        salesParams.set("endDate", appliedEndDate);
        productParams.set("endDate", appliedEndDate);
      }

      const [salesRes, productsRes] = await Promise.all([
        api.get(`/reports/sales?${salesParams.toString()}`),
        api.get(`/reports/products?${productParams.toString()}`)
      ]);

      setReportData(salesRes.data);
      setTopProducts(productsRes.data);
      setLastUpdated(new Date());
    } catch {
      if (!silent) {
        toast.error("Failed to load reports");
      }
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [period, appliedStartDate, appliedEndDate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      load({ silent: true });
    }, 15000);

    const handleFocus = () => {
      load({ silent: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [load]);

  const handleApply = () => {
    const filtersChanged = startDate !== appliedStartDate || endDate !== appliedEndDate;
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);

    if (!filtersChanged) {
      load();
    }
  };

  const handleReset = () => {
    const hasActiveFilters = Boolean(startDate || endDate || appliedStartDate || appliedEndDate);
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");

    if (!hasActiveFilters) {
      load();
    }
  };

  const chartData = (reportData.data || []).map(d => {
    let label = "";
    if (period === "daily") label = `${d._id.month}/${d._id.day}`;
    else if (period === "weekly") label = `W${d._id.week}`;
    else if (period === "yearly") label = `${d._id.year}`;
    else label = `${d._id.month}/${String(d._id.year).slice(2)}`;
    return { label, value: d.total };
  });

  const summary = reportData.summary;

  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod);
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
  };

  const renderPeriodTabs = (marginBottom = "1rem") => (
    <div style={{ display: "flex", gap: "0.4rem", marginBottom, flexWrap: "wrap" }}>
      {periodTabs.map(tab => (
        <button
          key={tab}
          onClick={() => handlePeriodChange(tab)}
          style={{
            padding: "0.45rem 1.1rem",
            borderRadius: "999px",
            border: "1px solid var(--border)",
            background: period === tab ? "var(--accent)" : "var(--bg2)",
            color: period === tab ? "var(--accent-ink)" : "var(--text2)",
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
  );

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (appliedStartDate) params.set("startDate", appliedStartDate);
      if (appliedEndDate) params.set("endDate", appliedEndDate);

      await downloadAuthenticatedFile(
        `/reports/excel${params.toString() ? `?${params.toString()}` : ""}`,
        "order-history-report.xls"
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to export report");
    }
  };

  return (
    <Layout>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}
      >
        <div>
          <h1>Reports &amp; Analytics</h1>
          <p className="text-muted">Sales performance and insights</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleExport}
        >
          📊 Export Order History Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="card-grid stagger" style={{ marginBottom: "1rem" }}>
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

      {lastUpdated ? (
        <p className="text-muted" style={{ marginTop: "-0.35rem", marginBottom: "1rem" }}>
          Live update {refreshing ? "(refreshing...)" : `as of ${lastUpdated.toLocaleTimeString()}`}
        </p>
      ) : null}

      {/* Date Range Override */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text3)" }}>Date range:</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span style={{ color: "var(--text3)" }}>to</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <button className="btn btn-sm primary" onClick={handleApply}>Apply</button>
        <button className="btn btn-ghost btn-sm" onClick={handleReset}>Reset</button>
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
        {renderPeriodTabs()}
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

    </Layout>
  );
};

export default ReportsPage;
