import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../state/AuthContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

const FOOD_EMOJIS = ["🍔", "🍕", "🍜", "🍣", "🌮", "🥗", "🍱", "🥩", "🍗", "🥘", "🍛", "🥪"];

function foodEmoji(name = "") {
  const n = name.toLowerCase();
  if (n.includes("burger") || n.includes("beef")) return "🍔";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("noodle") || n.includes("pasta") || n.includes("ramen")) return "🍜";
  if (n.includes("sushi") || n.includes("fish") || n.includes("salmon")) return "🍣";
  if (n.includes("taco") || n.includes("wrap")) return "🌮";
  if (n.includes("salad") || n.includes("veg")) return "🥗";
  if (n.includes("chicken")) return "🍗";
  if (n.includes("rice") || n.includes("fried")) return "🍱";
  if (n.includes("soup") || n.includes("stew")) return "🥘";
  if (n.includes("curry") || n.includes("indian")) return "🍛";
  if (n.includes("sandwich") || n.includes("sub")) return "🥪";
  const i = name.charCodeAt(0) % FOOD_EMOJIS.length;
  return FOOD_EMOJIS[i];
}

const MenuPage = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pr, cr] = await Promise.all([
          api.get("/products"),
          api.get("/categories"),
        ]);
        setProducts(pr.data);
        setCategories(cr.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = !selectedCategory || p.category?._id === selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="menu-page">
      {/* Header */}
      <header className="menu-header">
        <div className="menu-header-logo">
          <div className="logo-icon" style={{ overflow: "hidden", borderRadius: settings?.logoUrl ? "0.5rem" : undefined }}>
            {settings?.logoUrl
              ? <img src={settings.logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "🍽️"
            }
          </div>
          <span style={{ fontWeight: 800 }}>{settings?.name || "Coy's Corner"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {user && (
            <>
              <span style={{ fontSize: "0.85rem", color: "var(--text2)" }}>
                Hi, {user.name.split(" ")[0]}
              </span>
              <Link to="/" className="btn btn-ghost btn-sm">Dashboard</Link>
              <button className="btn btn-sm" onClick={logout}>Sign out</button>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="menu-hero">
        <h1>Our Menu</h1>
        <p>
          Fresh ingredients, bold flavours. Browse our full menu below.
        </p>
      </div>

      {/* Filters */}
      <div className="menu-filters">
        <input
          placeholder="🔍  Search food…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="category-pills">
          <button
            className={`cat-pill ${selectedCategory === "" ? "active" : ""}`}
            onClick={() => setSelectedCategory("")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              className={`cat-pill ${selectedCategory === c._id ? "active" : ""}`}
              onClick={() => setSelectedCategory(c._id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="centered" style={{ height: "30vh" }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1.75rem", color: "var(--text3)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🍽️</div>
          <p>No items match your search.</p>
        </div>
      ) : (
        <div className="menu-grid stagger">
          {filtered.map((p) => (
            <div key={p._id} className="food-card">
              <div className="food-card-img">
                {p.imageUrl
                  ? <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                    />
                  : foodEmoji(p.name)
                }
              </div>
              <div className="food-card-body">
                <div className="food-card-cat">{p.category?.name}</div>
                <div className="food-card-name">{p.name}</div>
                <div className="food-card-price">₱{p.price.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
          color: "var(--text3)",
          fontSize: "0.8rem",
          borderTop: "1px solid var(--border)",
          marginTop: "2rem",
        }}
      >
        © {new Date().getFullYear()} Coy's Corner · All rights reserved
      </div>
    </div>
  );
};

export default MenuPage;
