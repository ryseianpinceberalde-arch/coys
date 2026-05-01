import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import api from "../utils/api";
import { useAuth } from "../state/AuthContext.jsx";

const FOOD_EMOJIS = ["🍔", "🍕", "🍜", "🍣", "🌮", "🥗", "🍱", "🥩", "🍗", "🥘", "🍛", "🥪"];
function foodEmoji(name = "") {
  return FOOD_EMOJIS[name.charCodeAt(0) % FOOD_EMOJIS.length];
}

const reservationStatusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());

const TABLE_MONITOR_STYLES = {
  free: { background: "rgba(34,197,94,0.12)", color: "#22c55e" },
  reserved: { background: "rgba(245,158,11,0.14)", color: "#f59e0b" },
  waiting: { background: "rgba(59,130,246,0.14)", color: "#3b82f6" },
  unassigned: { background: "rgba(148,163,184,0.18)", color: "var(--text2)" },
};

const UserDashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [reservationLoading, setReservationLoading] = useState(true);

  useEffect(() => {
    api.get("/products")
      .then((res) => setProducts(res.data.slice(0, 8)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get("/reservations")
      .then((res) => setReservations(Array.isArray(res.data) ? res.data.slice(0, 3) : []))
      .catch(() => setReservations([]))
      .finally(() => setReservationLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-muted">Browse our menu and find something delicious</p>
      </div>

      {/* CTA */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, var(--accent-soft-5), var(--accent-soft-2))",
          border: "1px solid var(--accent-border)",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
            🍽️ Explore our full menu
          </div>
          <div className="text-muted text-sm">
            Filter by category, search for your favourites, and discover new dishes.
          </div>
        </div>
        <Link
          to="/menu"
          className="btn primary"
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          View full menu →
        </Link>
      </div>

      <div className="section" style={{ marginBottom: "2rem" }}>
        <h2>Table Monitor</h2>
        {reservationLoading ? (
          <div className="card" style={{ color: "var(--text3)", padding: "1.25rem" }}>Loading your reservations...</div>
        ) : !reservations.length ? (
          <div className="card" style={{ color: "var(--text3)", padding: "1.25rem" }}>
            No reservations yet. Your table availability and queue status will appear here after you book.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {reservations.map((reservation) => {
              const tableTone = TABLE_MONITOR_STYLES[reservation.tableMonitor?.status] || TABLE_MONITOR_STYLES.unassigned;
              return (
                <div key={reservation.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "var(--accent)", fontFamily: "monospace" }}>{reservation.reference}</div>
                      <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                        {reservation.date} at {reservation.time}
                      </div>
                    </div>
                    <span className="badge badge-blue">{reservationStatusLabel(reservation.status)}</span>
                  </div>

                  <div>
                    <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>TABLE</div>
                    <div style={{ fontWeight: 700 }}>{reservation.tableLabel || "Any table"}</div>
                  </div>

                  {reservation.tableMonitor?.tracked ? (
                    <div style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text2)" }}>Availability</span>
                        <span style={{
                          padding: "0.2rem 0.55rem",
                          borderRadius: "999px",
                          background: tableTone.background,
                          color: tableTone.color,
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}>
                          {reservationStatusLabel(reservation.tableMonitor.status)}
                        </span>
                      </div>
                      <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: "0.65rem", lineHeight: 1.5 }}>
                        {reservation.tableMonitor.message}
                      </div>
                      {reservation.tableMonitor.queuePosition ? (
                        <div style={{ marginTop: "0.65rem", fontWeight: 700, color: "var(--text)" }}>
                          Queue position #{reservation.tableMonitor.queuePosition}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ color: "var(--text3)", fontSize: "0.85rem" }}>
                      No specific table selected for this reservation.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Featured */}
      <div className="section">
        <h2>Featured Items</h2>
        {loading ? (
          <div style={{ padding: "2rem", color: "var(--text3)" }}>Loading…</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "1rem",
            }}
            className="stagger"
          >
            {products.map((p) => (
              <div key={p._id} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ fontSize: "2rem" }}>{foodEmoji(p.name)}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {p.category?.name}
                </div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: "var(--green)", fontWeight: 800, fontSize: "1.1rem" }}>
                  ${p.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserDashboard;
