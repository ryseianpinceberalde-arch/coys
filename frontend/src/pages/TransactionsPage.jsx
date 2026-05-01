import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Pagination from "../components/Pagination.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import api, { downloadAuthenticatedFile } from "../utils/api";

const statusTabs = ["all", "pending_payment", "completed", "cancelled", "refunded"];

const statusBadge = (status) => {
  if (status === "pending_payment") return "badge-blue";
  if (status === "completed") return "badge-green";
  if (status === "cancelled") return "badge-red";
  if (status === "refunded") return "badge-amber";
  return "";
};

const paymentStatusBadge = (status) => {
  if (status === "paid") return "badge-green";
  if (status === "pending") return "badge-amber";
  if (status === "expired" || status === "failed") return "badge-red";
  return "badge-blue";
};

const formatStatusLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const PAYMENT_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  qrph: "GCash QR",
  card: "Card",
  stripe: "Stripe",
  mixed: "Mixed"
};

const formatPaymentMethodLabel = (paymentMethod) =>
  PAYMENT_LABELS[String(paymentMethod || "").toLowerCase()] || formatStatusLabel(paymentMethod || "cash");

const stripeQrCodeUrl = (paymentUrl) =>
  paymentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(paymentUrl)}`
    : "";

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
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
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
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusTab !== "all") params.set("status", statusTab);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", targetPage);
      params.set("limit", 20);

      const res = await api.get(`/sales?${params.toString()}`);
      setSales(res.data.sales || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setPage(targetPage);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate, statusTab, toast]);

  useEffect(() => {
    load(1);
  }, [load, statusTab]);

  const canCancelSale = useCallback((sale) => {
    if (!sale) {
      return false;
    }

    if (sale.status === "pending_payment") {
      return user?.role === "admin" || user?.role === "staff";
    }

    return user?.role === "admin" && sale.status === "completed";
  }, [user?.role]);

  const refreshSale = useCallback(async (saleId, { silent = false } = {}) => {
    if (!saleId) {
      return null;
    }

    if (!silent) {
      setLoadingDetail(true);
    }

    try {
      const res = await api.get(`/sales/${saleId}`);
      const nextSale = res.data;

      setSales((current) => current.map((entry) => (entry._id === nextSale._id ? nextSale : entry)));
      setSelectedSale((current) => {
        if (current?._id === nextSale._id && current.paymentStatus !== nextSale.paymentStatus) {
          if (nextSale.paymentStatus === "paid") {
            toast.success(`${nextSale.invoiceNumber} is now paid`);
          } else if (nextSale.paymentStatus === "expired") {
            toast.warning(`${nextSale.invoiceNumber} payment expired`);
          }
        }

        return current?._id === nextSale._id ? nextSale : current;
      });

      return nextSale;
    } catch (err) {
      if (!silent) {
        toast.error(err.response?.data?.message || "Failed to refresh sale details");
      }

      return null;
    } finally {
      if (!silent) {
        setLoadingDetail(false);
      }
    }
  }, [toast]);

  const handleApply = () => load(1);

  const openDetail = (sale) => {
    setSelectedSale(sale);
    setDetailOpen(true);
    refreshSale(sale._id, { silent: true });
  };

  const handleCancel = async () => {
    if (!cancelTarget) {
      return;
    }

    try {
      await api.post(`/sales/${cancelTarget._id}/cancel`, { reason: cancelReason || "No reason provided" });
      toast.success("Sale cancelled and stock restored");

      if (selectedSale?._id === cancelTarget._id) {
        setDetailOpen(false);
        setSelectedSale(null);
      }

      setCancelReason("");
      setCancelTarget(null);
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    }
  };

  useEffect(() => {
    if (!detailOpen || !selectedSale?._id || !selectedSale.paymentUrl || selectedSale.paymentStatus === "paid") {
      return undefined;
    }

    const interval = window.setInterval(() => {
      refreshSale(selectedSale._id, { silent: true });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [detailOpen, refreshSale, selectedSale?._id, selectedSale?.paymentStatus, selectedSale?.paymentUrl]);

  const filtered = search
    ? sales.filter((sale) => (sale.invoiceNumber || "").toLowerCase().includes(search.toLowerCase()))
    : sales;

  const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;

  const openPaymentLink = (paymentUrl) => {
    if (!paymentUrl) {
      return;
    }

    window.open(paymentUrl, "_blank", "noopener,noreferrer");
  };

  const copyPaymentLink = async (paymentUrl) => {
    if (!paymentUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(paymentUrl);
      toast.success("Payment link copied");
    } catch {
      toast.error("Unable to copy the payment link");
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

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
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>History</h1>
          <p className="text-muted">{total} total records</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleExport}
        >
          Export Excel
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "999px",
              border: "1px solid var(--border)",
              background: statusTab === tab ? "var(--accent)" : "var(--bg2)",
              color: statusTab === tab ? "var(--accent-ink)" : "var(--text2)",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
              fontFamily: "inherit",
              textTransform: "capitalize",
              transition: "all var(--transition)"
            }}
          >
            {formatStatusLabel(tab)}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search invoice #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 200 }}
        />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn btn-sm primary" onClick={handleApply}>Apply</button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setSearch("");
            setStatusTab("all");
          }}
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
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>
                  No history found
                </td>
              </tr>
            )}
            {filtered.map((sale) => (
              <tr
                key={sale._id}
                style={{ cursor: "pointer" }}
                onClick={() => openDetail(sale)}
              >
                <td style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "monospace" }}>{sale.invoiceNumber || "-"}</td>
                <td style={{ color: "var(--text2)", fontSize: "0.82rem" }}>
                  <div>{new Date(sale.createdAt).toLocaleDateString()}</div>
                  <div style={{ color: "var(--text3)" }}>{timeAgo(sale.createdAt)}</div>
                </td>
                <td style={{ color: "var(--text)" }}>{sale.cashier?.name || "-"}</td>
                <td>
                  <span className="badge badge-blue">{sale.items?.length || 0} items</span>
                </td>
                <td style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(sale.total)}</td>
                <td>
                  <div style={{ color: "var(--text2)", fontSize: "0.82rem" }}>{formatPaymentMethodLabel(sale.paymentMethod)}</div>
                  <div style={{ marginTop: "0.2rem" }}>
                    <span className={`badge ${paymentStatusBadge(sale.paymentStatus)}`}>
                      {formatStatusLabel(sale.paymentStatus || "paid")}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${statusBadge(sale.status)}`}>{formatStatusLabel(sale.status)}</span>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => navigate(`/receipt/${sale._id}`)}
                      title="Print Receipt"
                    >
                      Receipt
                    </button>
                    {sale.paymentUrl && sale.paymentStatus !== "paid" && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => openDetail(sale)}
                      >
                        Collect
                      </button>
                    )}
                    {canCancelSale(sale) && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          setCancelTarget(sale);
                          setCancelReason("");
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={pages} onPageChange={(nextPage) => load(nextPage)} />

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`Invoice: ${selectedSale?.invoiceNumber || ""}`} size="lg">
        {selectedSale && (
          <div>
            {loadingDetail && (
              <div style={{ marginBottom: "1rem", color: "var(--text3)", fontSize: "0.82rem" }}>
                Refreshing payment details...
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>DATE</div>
                <div style={{ fontWeight: 600 }}>{new Date(selectedSale.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>CASHIER</div>
                <div style={{ fontWeight: 600 }}>{selectedSale.cashier?.name || "-"}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>CUSTOMER</div>
                <div style={{ fontWeight: 600 }}>{selectedSale.customer?.name || "Walk-in"}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>STATUS</div>
                <span className={`badge ${statusBadge(selectedSale.status)}`}>{formatStatusLabel(selectedSale.status)}</span>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>PAYMENT STATUS</div>
                <span className={`badge ${paymentStatusBadge(selectedSale.paymentStatus)}`}>{formatStatusLabel(selectedSale.paymentStatus || "paid")}</span>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>PAYMENT METHOD</div>
                <div style={{ fontWeight: 600 }}>{formatPaymentMethodLabel(selectedSale.paymentMethod)}</div>
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
                  {selectedSale.items?.map((item, index) => (
                    <tr key={`${selectedSale._id}-${index}`}>
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
                <span>{formatPaymentMethodLabel(selectedSale.paymentMethod)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text2)" }}>Payment Status</span>
                <span>{formatStatusLabel(selectedSale.paymentStatus || "paid")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text2)" }}>Received</span>
                <span>{fmt(selectedSale.paymentReceived)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text2)" }}>Change</span>
                <span>{fmt(selectedSale.change)}</span>
              </div>
              {selectedSale.paymentPaidAt && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text2)" }}>Paid At</span>
                  <span>{new Date(selectedSale.paymentPaidAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {selectedSale.paymentUrl && selectedSale.paymentStatus !== "paid" && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--bg2)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                    <div>
                      <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>COLLECT PAYMENT</div>
                      <div style={{ color: "var(--text2)", lineHeight: 1.5 }}>
                      Show this QR code to the customer or open the hosted payment link directly.
                      </div>
                    </div>
                  <span className={`badge ${paymentStatusBadge(selectedSale.paymentStatus)}`}>
                    {formatStatusLabel(selectedSale.paymentStatus || "pending")}
                  </span>
                </div>

                <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <div style={{ background: "#fff", padding: "0.9rem", borderRadius: "1rem", border: "1px solid var(--border)", width: "fit-content" }}>
                    <img
                      src={stripeQrCodeUrl(selectedSale.paymentUrl)}
                      alt={`Payment QR for ${selectedSale.invoiceNumber}`}
                      style={{ display: "block", width: 240, height: 240, maxWidth: "100%" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ padding: "0.9rem", borderRadius: "1rem", background: "var(--surface)", border: "1px solid var(--border)", wordBreak: "break-all", fontSize: "0.78rem", color: "var(--text2)" }}>
                      {selectedSale.paymentUrl}
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button className="btn primary" onClick={() => openPaymentLink(selectedSale.paymentUrl)}>
                        Open Checkout
                      </button>
                      <button className="btn btn-ghost" onClick={() => copyPaymentLink(selectedSale.paymentUrl)}>
                        Copy Link
                      </button>
                      <button className="btn btn-ghost" onClick={() => refreshSale(selectedSale._id)}>
                        Refresh Status
                      </button>
                      {canCancelSale(selectedSale) && (
                        <button
                          className="btn btn-danger"
                          onClick={() => {
                            setCancelTarget(selectedSale);
                            setCancelReason("");
                          }}
                        >
                          Cancel Sale
                        </button>
                      )}
                    </div>

                    <div style={{ color: "var(--text3)", fontSize: "0.78rem", lineHeight: 1.5 }}>
                      Pending online-payment sales keep stock reserved until payment is confirmed or the sale is cancelled.
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.25rem" }}>
              <button
                className="btn primary"
                onClick={() => {
                  setDetailOpen(false);
                  navigate(`/receipt/${selectedSale._id}`);
                }}
                style={{ flex: 1 }}
              >
                Print Receipt
              </button>
              {selectedSale.paymentUrl && selectedSale.paymentStatus !== "paid" && (
                <button className="btn btn-ghost" onClick={() => refreshSale(selectedSale._id)}>
                  Refresh
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Sale"
        message={(
          <div>
            <p style={{ marginBottom: "0.75rem" }}>
              Are you sure you want to cancel invoice <strong>{cancelTarget?.invoiceNumber}</strong>? Stock will be restored.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>
        )}
        confirmLabel="Cancel Sale"
        variant="danger"
      />
    </Layout>
  );
};

export default TransactionsPage;
