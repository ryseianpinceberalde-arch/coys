import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../utils/api";

const STATUS_TABS = ["all", "pending", "confirmed", "arrived", "completed", "cancelled"];
const NEXT_STATUS = {
  pending: "confirmed",
  confirmed: "arrived",
  arrived: "completed"
};

const STATUS_BADGES = {
  pending: "badge-amber",
  confirmed: "badge-blue",
  arrived: "badge-blue",
  completed: "badge-green",
  cancelled: "badge-red"
};

const NEXT_LABELS = {
  confirmed: "Confirm",
  arrived: "Mark Arrived",
  completed: "Complete"
};

const statusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());

const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;

const ReservationsPage = () => {
  const toast = useToast();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reservations");
      setReservations(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const updateReservationStatus = async (reservation, nextStatus, reason = "") => {
    setUpdatingId(reservation.id);
    try {
      const res = await api.patch(`/reservations/${reservation.id}/status`, {
        status: nextStatus,
        reason,
      });
      const updated = res.data;
      setReservations((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setSelectedReservation((prev) => (prev?.id === updated.id ? updated : prev));
      toast.success(`${updated.reference} marked ${statusLabel(updated.status).toLowerCase()}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update reservation");
    } finally {
      setUpdatingId("");
    }
  };

  const visibleReservations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reservations.filter((reservation) => {
      const matchesStatus = statusTab === "all" || reservation.status === statusTab;
      const matchesSearch = !query || [
        reservation.reference,
        reservation.customer?.name,
        reservation.customer?.phone,
        reservation.tableLabel,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [reservations, search, statusTab]);

  return (
    <Layout>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Reservations</h1>
          <p className="text-muted">{reservations.length} total reservations</p>
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
          placeholder="Search reference, guest, phone, table..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 260 }}
        />
        <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setStatusTab("all"); }}>
          Reset
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Date & Time</th>
              <th>Guest</th>
              <th>Party</th>
              <th>Table</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>Loading reservations...</td>
              </tr>
            )}
            {!loading && !visibleReservations.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>No reservations found</td>
              </tr>
            )}
            {visibleReservations.map((reservation) => {
              const nextStatus = NEXT_STATUS[reservation.status];
              return (
                <tr key={reservation.id} style={{ cursor: "pointer" }} onClick={() => { setSelectedReservation(reservation); setDetailOpen(true); }}>
                  <td style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "monospace" }}>{reservation.reference}</td>
                  <td>
                    <div>{reservation.date}</div>
                    <div style={{ color: "var(--text3)", fontSize: "0.82rem" }}>{reservation.time}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{reservation.customer?.name || "-"}</div>
                    <div style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{reservation.customer?.phone || "-"}</div>
                  </td>
                  <td>{reservation.partySize || 1}</td>
                  <td>{reservation.tableLabel || "Any"}</td>
                  <td style={{ fontWeight: 700, color: "var(--green)" }}>{fmt(reservation.total)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGES[reservation.status] || "badge-blue"}`}>{statusLabel(reservation.status)}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setSelectedReservation(reservation); setDetailOpen(true); }}>
                        View
                      </button>
                      {nextStatus && (
                        <button
                          className="btn btn-sm primary"
                          disabled={updatingId === reservation.id}
                          onClick={() => updateReservationStatus(reservation, nextStatus)}
                        >
                          {updatingId === reservation.id ? "Updating..." : NEXT_LABELS[nextStatus]}
                        </button>
                      )}
                      {["pending", "confirmed", "arrived"].includes(reservation.status) && (
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={updatingId === reservation.id}
                          onClick={() => {
                            setCancelTarget(reservation);
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

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={selectedReservation?.reference || "Reservation"} size="lg">
        {selectedReservation && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>DATE</div>
                <div style={{ fontWeight: 700 }}>{selectedReservation.date}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>TIME</div>
                <div style={{ fontWeight: 700 }}>{selectedReservation.time}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>PARTY SIZE</div>
                <div style={{ fontWeight: 700 }}>{selectedReservation.partySize || 1} guest(s)</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>TABLE</div>
                <div style={{ fontWeight: 700 }}>{selectedReservation.tableLabel || "Any table"}</div>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>STATUS</div>
                <span className={`badge ${STATUS_BADGES[selectedReservation.status] || "badge-blue"}`}>{statusLabel(selectedReservation.status)}</span>
              </div>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>ARRIVED</div>
                <div style={{ fontWeight: 700 }}>{selectedReservation.arrivedAt ? new Date(selectedReservation.arrivedAt).toLocaleString() : "Not yet"}</div>
              </div>
            </div>

            <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "1rem" }}>
              <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.6rem" }}>CUSTOMER</div>
              <div style={{ fontWeight: 700 }}>{selectedReservation.customer?.name || "-"}</div>
              <div style={{ color: "var(--text2)", marginTop: "0.2rem" }}>{selectedReservation.customer?.phone || "-"}</div>
              <div style={{ color: "var(--text2)", marginTop: "0.2rem" }}>{selectedReservation.customer?.email || "-"}</div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReservation.items.map((item, index) => (
                    <tr key={`${selectedReservation.id}-${index}`}>
                      <td>{item.name}</td>
                      <td>{item.qty}</td>
                      <td>{fmt(item.qty * item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!!selectedReservation.notes && (
              <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "1rem", color: "var(--text2)" }}>
                {selectedReservation.notes}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => updateReservationStatus(cancelTarget, "cancelled", cancelReason || "Cancelled by staff")}
        title="Cancel Reservation"
        message={(
          <div>
            <p style={{ marginBottom: "0.75rem" }}>
              Cancel <strong>{cancelTarget?.reference}</strong>?
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
        confirmLabel="Cancel Reservation"
        variant="danger"
      />
    </Layout>
  );
};

export default ReservationsPage;
