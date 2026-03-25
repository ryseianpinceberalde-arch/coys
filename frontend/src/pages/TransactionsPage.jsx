import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Pagination from "../components/Pagination.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../utils/api";

const statusTabs = ["all", "completed", "cancelled", "refunded"];

const statusBadge = (s) => {
  if (s === "completed") return "badge-green";
  if (s === "cancelled") return "badge-red";
  if (s === "refunded") return "badge-amber";
  return "";
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const TransactionsPage = () => {
  const toast = useToast();
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedSale, setSelectedSale] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusTab !== "all") params.set("status", statusTab);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", pg);
      params.set("limit", 20);
      const res = await api.get(`/sales?${params.toString()}`);
      setSales(res.data.sales || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setPage(pg);
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [statusTab, startDate, endDate, toast]);

  useEffect(() => { load(1); }, [statusTab]);

  const handleApply = () => load(1);

  const openDetail = (sale) => { setSelectedSale(sale); setDetailOpen(true); };

  const handleCancel = async () => {
    try {
      await api.post(`/sales/${cancelTarget._id}/cancel`, { reason: cancelReason || "No reason provided" });
      toast.success("Sale cancelled and stock restored");
      setCancelReason("");
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    }
  };

  const filtered = search
    ? sales.filter(s => (s.invoiceNumber || "").toLowerCase().includes(search.toLowerCase()))
    : sales;

  const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;

  return (
    <Layout>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Transactions</h1>
          <p className="text-muted">{total} total transactions</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const params = new URLSearchParams();
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);
            window.open(`/api/reports/csv?type=sales&${params.toString()}`, "_blank");
          }}
        >
          📥 Export CSV
        </button>
      </div>

      {/* Status Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {statusTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: statusTab === tab ? "var(--accent)" : "var(--bg2)",
              color: statusTab === tab ? "#fff" : "var(--text2)",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
              fontFamily: "inherit",
              textTransform: "capitalize",
              transition: "all var(--transition)"
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search invoice #…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <button className="btn btn-sm primary" onClick={handleApply}>Apply</button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { setStartDate(""); setEndDate(""); setSearch(""); setStatusTab("all"); }}
        >
          Reset
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date &amp; Time</th>
              <th>Cashier</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>No transactions found</td></tr>
            )}
            {filtered.map(s => (
              <tr
                key={s._id}
                style={{ cursor: "pointer" }}
                onClick={() => openDetail(s)}
              >
                <td style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "monospace" }}>{s.invoiceNumber || "—"}</td>
                <td style={{ color: "var(--text2)", fontSize: "0.82rem" }}>
                  <div>{new Date(s.createdAt).toLocaleDateString()}</div>
                  <div style={{ color: "var(--text3)" }}>{timeAgo(s.createdAt)}</div>
                </td>
                <td style={{ color: "var(--text)" }}>{s.cashier?.name || "—"}</td>
                <td>
                  <span className="badge badge-blue">{s.items?.length || 0} items</span>
                </td>
                <td style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(s.total)}</td>
                <td>
                  <span style={{ textTransform: "capitalize", color: "var(--text2)", fontSize: "0.82rem" }}>{s.paymentMethod}</span>
                </td>
                <td>
                  <span className={`badge ${statusBadge(s.status)}`} style={{ textTransform: "capitalize" }}>{s.status}</span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  {s.status === "completed" && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => { setCancelTarget(s); setCancelReason(""); }}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={pages} onPageChange={p => load(p)} />

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`Invoice: ${selectedSale?.invoiceNumber || ""}`} size="lg">
        {selectedSale && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>DATE</div>
                <div style={{ fontWeight: 600 }}>{new Date(selectedSale.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>CASHIER</div>
                <div style={{ fontWeight: 600 }}>{selectedSale.cashier?.name || "—"}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>CUSTOMER</div>
                <div style={{ fontWeight: 600 }}>{selectedSale.customer?.name || "Walk-in"}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>STATUS</div>
                <span className={`badge ${statusBadge(selectedSale.status)}`} style={{ textTransform: "capitalize" }}>{selectedSale.status}</span>
              </div>
            </div>

            <div className="table-wrap" style={{ marginBottom: "1.25rem" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items?.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{fmt(item.price)}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", background: "var(--bg2)", padding: "1rem", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text2)" }}>Subtotal</span>
                <span>{fmt(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text2)" }}>Discount ({selectedSale.discountType})</span>
                  <span style={{ color: "var(--red)" }}>- {fmt(selectedSale.discountAmount)}</span>
                </div>
              )}
              {selectedSale.tax > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text2)" }}>Tax ({selectedSale.taxRate}%)</span>
                  <span>{fmt(selectedSale.tax)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--accent)" }}>{fmt(selectedSale.total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text2)" }}>Payment Method</span>
                <span style={{ textTransform: "capitalize" }}>{selectedSale.paymentMethod}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text2)" }}>Received</span>
                <span>{fmt(selectedSale.paymentReceived)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text2)" }}>Change</span>
                <span>{fmt(selectedSale.change)}</span>
              </div>
            </div>

            {selectedSale.notes && (
              <div style={{ marginTop: "1rem" }}>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>NOTES</div>
                <div style={{ color: "var(--text2)" }}>{selectedSale.notes}</div>
              </div>
            )}
            {selectedSale.cancelReason && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div style={{ color: "var(--red)", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>CANCEL REASON</div>
                <div style={{ color: "var(--text2)" }}>{selectedSale.cancelReason}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Confirm */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Sale"
        message={
          <div>
            <p style={{ marginBottom: "0.75rem" }}>
              Are you sure you want to cancel invoice <strong>{cancelTarget?.invoiceNumber}</strong>? Stock will be restored.
            </p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>
        }
        confirmLabel="Cancel Sale"
        variant="danger"
      />
    </Layout>
  );
};

export default TransactionsPage;
