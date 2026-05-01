import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Pagination from "../components/Pagination.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../utils/api";
import { playNotificationSound } from "../utils/notificationSound.js";
import { getRealtimeUrl } from "../utils/realtime.js";

const STATUS_TABS = ["all", "pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
const NEXT_STATUS = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed"
};

const STATUS_BADGES = {
  pending: "badge-amber",
  confirmed: "badge-blue",
  preparing: "badge-blue",
  ready: "badge-green",
  completed: "badge-green",
  cancelled: "badge-red"
};

const NEXT_LABELS = {
  confirmed: "Confirm",
  preparing: "Start Prep",
  ready: "Mark Ready",
  completed: "Complete"
};

const PAYMENT_STATUS_BADGES = {
  pending: "badge-amber",
  paid: "badge-green"
};

const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const statusLabel = (status) => status.charAt(0).toUpperCase() + status.slice(1);

const nextActionLabel = (status) => {
  const next = NEXT_STATUS[status];
  return next ? NEXT_LABELS[next] : "";
};

const PAYMENT_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  qrph: "GCash QR",
  card: "Card",
  stripe: "Stripe"
};

const formatPaymentMethodLabel = (paymentMethod) =>
  PAYMENT_LABELS[String(paymentMethod || "").toLowerCase()] || String(paymentMethod || "cash");

const isPaidOrder = (order) => String(order?.paymentStatus || "").toLowerCase() === "paid";
const isManualOrder = (order) => String(order?.paymentProvider || "").toLowerCase() === "manual";
const canAdvanceOrder = (order) => isManualOrder(order) || isPaidOrder(order);
const canCancelOrder = (order) =>
  !["completed", "cancelled"].includes(order?.status) && (isManualOrder(order) || !isPaidOrder(order));

const OrdersPage = () => {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const latestLoadRef = useRef(null);
  const localUpdateRef = useRef(new Map());

  const loadOrders = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", targetPage);
      params.set("limit", 20);
      if (statusTab !== "all") {
        params.set("status", statusTab);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await api.get(`/orders?${params.toString()}`);
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setPage(targetPage);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load mobile orders");
    } finally {
      setLoading(false);
    }
  }, [search, statusTab, toast]);

  latestLoadRef.current = loadOrders;

  useEffect(() => {
    loadOrders(1);
  }, [statusTab, loadOrders]);

  const applyFilters = () => loadOrders(1);

  const openDetail = (order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  const updateOrderStatus = async (order, nextStatus, reason = "") => {
    setUpdatingId(order.id);
    try {
      const res = await api.patch(`/orders/${order.id}/status`, {
        status: nextStatus,
        reason,
        note: reason
      });
      const updated = res.data;
      localUpdateRef.current.set(updated.id, { status: updated.status, at: Date.now() });
      setOrders((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setSelectedOrder((prev) => (prev?.id === updated.id ? updated : prev));
      if (updated.status === "ready") {
        void playNotificationSound();
      }
      toast.success(`${updated.orderNumber} marked ${statusLabel(updated.status).toLowerCase()}`);
      await loadOrders(page);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order");
    } finally {
      setUpdatingId("");
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) {
      return;
    }

    await updateOrderStatus(cancelTarget, "cancelled", cancelReason || "Cancelled by staff");
    setCancelReason("");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return undefined;
    }

    const socket = new WebSocket(getRealtimeUrl(token));

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type !== "order.created" && message.type !== "order.updated") {
          return;
        }

        const nextOrder = message.data;
        const localUpdate = localUpdateRef.current.get(nextOrder.id);
        const skipRealtimeToast =
          message.type === "order.updated"
          && localUpdate
          && localUpdate.status === nextOrder.status
          && Date.now() - localUpdate.at < 5000;

        if (skipRealtimeToast) {
          localUpdateRef.current.delete(nextOrder.id);
        }

        setOrders((prev) => {
          const exists = prev.some((entry) => entry.id === nextOrder.id);
          if (!exists && message.type === "order.created") {
            return [nextOrder, ...prev].slice(0, 20);
          }
          return prev.map((entry) => (entry.id === nextOrder.id ? nextOrder : entry));
        });
        setSelectedOrder((prev) => (prev?.id === nextOrder.id ? nextOrder : prev));

        if (!skipRealtimeToast && message.type === "order.created") {
          void playNotificationSound();
          toast.info(`New mobile order ${nextOrder.orderNumber}`);
        } else if (!skipRealtimeToast) {
          if (nextOrder.status === "ready") {
            void playNotificationSound();
          }
          toast.info(`${nextOrder.orderNumber} is now ${statusLabel(nextOrder.status)}`);
        }

        latestLoadRef.current?.(page);
      } catch {
        // Ignore malformed realtime payloads.
      }
    };

    return () => socket.close();
  }, [page, toast]);

  const visibleOrders = useMemo(() => orders, [orders]);

  return (
    <Layout>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Mobile Orders</h1>
          <p className="text-muted">{total} customer mobile orders</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {STATUS_TABS.map((tab) => (
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
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search order, customer, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <button className="btn btn-sm primary" onClick={applyFilters}>Apply</button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
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
              <th>Order #</th>
              <th>Queue</th>
              <th>Created</th>
              <th>Customer</th>
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
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>Loading mobile orders...</td>
              </tr>
            )}
            {!loading && !visibleOrders.length && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>No mobile orders found</td>
              </tr>
            )}
            {visibleOrders.map((order) => {
              const nextStatus = NEXT_STATUS[order.status];
              const allowAdvance = nextStatus && canAdvanceOrder(order);
              return (
                <tr key={order.id} style={{ cursor: "pointer" }} onClick={() => openDetail(order)}>
                  <td style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "monospace" }}>{order.orderNumber}</td>
                  <td style={{ fontWeight: 700 }}>#{String(order.queueNumber || 0).padStart(3, "0")}</td>
                  <td style={{ color: "var(--text2)", fontSize: "0.82rem" }}>
                    <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                    <div style={{ color: "var(--text3)" }}>{timeAgo(order.createdAt)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{order.customer.name}</div>
                    <div style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{order.customer.phone}</div>
                  </td>
                  <td>
                    <span className="badge badge-blue">{order.items.length} items</span>
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(order.total)}</td>
                  <td>
                    <span style={{ color: "var(--text2)", fontSize: "0.82rem" }}>{formatPaymentMethodLabel(order.paymentMethod)}</span>
                    <div style={{ marginTop: "0.2rem" }}>
                      <span className={`badge ${PAYMENT_STATUS_BADGES[order.paymentStatus] || "badge-blue"}`}>
                        {statusLabel(order.paymentStatus || "pending")}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGES[order.status] || "badge-blue"}`}>{statusLabel(order.status)}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => openDetail(order)}>View</button>
                      {nextStatus && (
                        <button
                          className="btn btn-sm primary"
                          disabled={updatingId === order.id || !allowAdvance}
                          onClick={() => updateOrderStatus(order, nextStatus)}
                          title={!allowAdvance ? "Payment must be completed before this order can move forward." : undefined}
                        >
                          {updatingId === order.id ? "Updating..." : nextActionLabel(order.status)}
                        </button>
                      )}
                      {canCancelOrder(order) && (
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={updatingId === order.id}
                          onClick={() => {
                            setCancelTarget(order);
                            setCancelReason("");
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={pages} onPageChange={(targetPage) => loadOrders(targetPage)} />

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selectedOrder?.orderNumber || "Order Details"} size="lg">
        {selectedOrder && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>CUSTOMER</div>
                <div style={{ fontWeight: 700 }}>{selectedOrder.customer.name}</div>
                <div style={{ color: "var(--text2)", marginTop: "0.2rem" }}>{selectedOrder.customer.phone}</div>
                <div style={{ color: "var(--text2)", marginTop: "0.2rem" }}>{selectedOrder.customer.email}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>ORDER STATUS</div>
                <span className={`badge ${STATUS_BADGES[selectedOrder.status] || "badge-blue"}`}>{statusLabel(selectedOrder.status)}</span>
                <div style={{ color: "var(--text2)", marginTop: "0.75rem" }}>
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </div>
                <div style={{ color: "var(--text2)", marginTop: "0.25rem" }}>
                  Queue #{String(selectedOrder.queueNumber || 0).padStart(3, "0")}
                </div>
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
                  {selectedOrder.items.map((item) => (
                    <tr key={`${selectedOrder.id}-${item.productId}`}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{fmt(item.price)}</td>
                      <td style={{ fontWeight: 700 }}>{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "1rem" }}>
              <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "1rem" }}>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>TIMELINE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {selectedOrder.timeline.map((entry, index) => (
                    <div key={`${selectedOrder.id}-timeline-${index}`} style={{ paddingBottom: "0.75rem", borderBottom: index === selectedOrder.timeline.length - 1 ? "none" : "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                        <span style={{ fontWeight: 700 }}>{statusLabel(entry.status)}</span>
                        <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      {!!entry.actorName && (
                        <div style={{ color: "var(--text2)", fontSize: "0.82rem", marginTop: "0.2rem" }}>
                          {entry.actorName} {entry.actorRole ? `(${entry.actorRole})` : ""}
                        </div>
                      )}
                      {!!entry.note && (
                        <div style={{ color: "var(--text2)", fontSize: "0.82rem", marginTop: "0.3rem" }}>{entry.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text2)" }}>Subtotal</span>
                  <span>{fmt(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.taxAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text2)" }}>Tax ({selectedOrder.taxRate}%)</span>
                    <span>{fmt(selectedOrder.taxAmount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                  <span style={{ fontWeight: 800 }}>Total</span>
                  <span style={{ fontWeight: 800, color: "var(--accent)" }}>{fmt(selectedOrder.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text2)" }}>Payment</span>
                  <span>{formatPaymentMethodLabel(selectedOrder.paymentMethod)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text2)" }}>Checkout Type</span>
                  <span>{selectedOrder.isGuest ? "Guest" : "Account"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text2)" }}>Payment Status</span>
                  <span>{statusLabel(selectedOrder.paymentStatus || "pending")}</span>
                </div>
                {!!selectedOrder.notes && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>CUSTOMER NOTE</div>
                    <div style={{ color: "var(--text2)" }}>{selectedOrder.notes}</div>
                  </div>
                )}
                {!!selectedOrder.cancelReason && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ color: "var(--red)", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.2rem" }}>CANCEL REASON</div>
                    <div style={{ color: "var(--text2)" }}>{selectedOrder.cancelReason}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Mobile Order"
        message={(
          <div>
            <p style={{ marginBottom: "0.75rem" }}>
              Cancel <strong>{cancelTarget?.orderNumber}</strong>? Stock will be restored automatically.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation"
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>
        )}
        confirmLabel="Cancel Order"
        variant="danger"
      />
    </Layout>
  );
};

export default OrdersPage;
