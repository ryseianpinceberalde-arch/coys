import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import api from "../utils/api";
import { useAuth } from "../state/AuthContext.jsx";

const FOOD_EMOJIS = ["🍔", "🍕", "🍜", "🍣", "🌮", "🥗", "🍱", "🥩", "🍗", "🥘", "🍛", "🥪"];
function foodEmoji(name = "") {
  return FOOD_EMOJIS[name.charCodeAt(0) % FOOD_EMOJIS.length];
}

const UserDashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/products")
      .then((res) => setProducts(res.data.slice(0, 8)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
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
          background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))",
          border: "1px solid rgba(249,115,22,0.25)",
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
