import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../utils/api";

const foodEmoji = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("cola") || n.includes("sprite") || n.includes("soda") || n.includes("drink") || n.includes("juice") || n.includes("tea") || n.includes("water")) return "🥤";
  if (n.includes("chip") || n.includes("piattos") || n.includes("cracker") || n.includes("snack")) return "🍿";
  if (n.includes("tuna") || n.includes("sardine") || n.includes("fish")) return "🐟";
  if (n.includes("corned") || n.includes("hotdog") || n.includes("meat") || n.includes("chicken") || n.includes("nugget")) return "🍖";
  if (n.includes("milk") || n.includes("cream") || n.includes("butter") || n.includes("dairy")) return "🥛";
  if (n.includes("soap") || n.includes("shampoo") || n.includes("toothpaste") || n.includes("detergent") || n.includes("cleaner")) return "🧼";
  if (n.includes("bread") || n.includes("pan de sal") || n.includes("bakery")) return "🍞";
  if (n.includes("chocolate") || n.includes("candy") || n.includes("sweet") || n.includes("sugar")) return "🍬";
  if (n.includes("sauce") || n.includes("ketchup") || n.includes("soy") || n.includes("condiment")) return "🫙";
  if (n.includes("ice cream") || n.includes("frozen")) return "🍦";
  if (n.includes("coffee")) return "☕";
  return "🛒";
};

const emptyCart = [];

const PosPage = () => {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState(emptyCart);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [prodRes, catRes, settingsRes] = await Promise.all([
        api.get("/products?limit=500"),
        api.get("/categories"),
        api.get("/settings").catch(() => ({ data: { taxRate: 0 } }))
      ]);
      const prods = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.products || []);
      setProducts(prods.filter(p => p.isActive && !p.isArchived));
      setCategories(catRes.data);
      setTaxRate(settingsRes.data.taxRate || 0);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = products.filter(p => {
    const matchCat = selectedCat === "all" || p.category?._id === selectedCat || p.category === selectedCat;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.barcode || "").includes(q);
    return matchCat && matchSearch;
  });

  const addToCart = (product) => {
    if (product.stockQuantity === 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.product === product._id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          toast.warning(`Only ${product.stockQuantity} in stock`);
          return prev;
        }
        return prev.map(i => i.product === product._id
          ? { ...i, quantity: i.quantity + 1 }
          : i
        );
      }
      return [...prev, {
        product: product._id,
        name: product.name,
        price: product.price,
        stock: product.stockQuantity,
        quantity: 1
      }];
    });
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.product !== productId));
    } else {
      setCart(prev => prev.map(i => {
        if (i.product !== productId) return i;
        if (qty > i.stock) { toast.warning(`Only ${i.stock} in stock`); return i; }
        return { ...i, quantity: qty };
      }));
    }
  };

  const removeItem = (productId) => setCart(prev => prev.filter(i => i.product !== productId));
  const clearCart = () => { setCart([]); setAmountReceived(""); setNotes(""); setDiscountType("none"); setDiscountValue(""); };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  let discountAmount = 0;
  if (discountType === "percent") discountAmount = subtotal * (parseFloat(discountValue || 0) / 100);
  else if (discountType === "fixed") discountAmount = parseFloat(discountValue || 0);
  discountAmount = Math.min(Math.max(0, discountAmount), subtotal);
  const afterDiscount = subtotal - discountAmount;
  const taxAmt = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmt;
  const received = parseFloat(amountReceived || 0);
  const change = paymentMethod === "cash" ? Math.max(0, received - total) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post("/sales", {
        items: cart.map(i => ({ product: i.product, quantity: i.quantity })),
        discountType,
        discountValue: parseFloat(discountValue || 0),
        taxRate,
        paymentMethod,
        paymentReceived: paymentMethod === "cash" ? received : total,
        notes
      });
      toast.success(`Sale complete! Invoice: ${res.data.invoiceNumber}`);
      clearCart();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n) => `₱${Number(n).toFixed(2)}`;

  return (
    <Layout>
      <div className="pos-layout">
        {/* LEFT: Product Browser */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", overflow: "hidden" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>Products</h2>

          <input
            placeholder="Search by name, SKU, or barcode…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: "0.9rem" }}
            autoFocus
          />

          {/* Category Pills */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setSelectedCat("all")}
              style={{
                padding: "0.3rem 0.8rem",
                borderRadius: "999px",
                border: "1px solid var(--border)",
                background: selectedCat === "all" ? "var(--accent)" : "var(--bg2)",
                color: selectedCat === "all" ? "#fff" : "var(--text2)",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 600,
                fontFamily: "inherit",
                transition: "all var(--transition)"
              }}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c._id}
                onClick={() => setSelectedCat(c._id)}
                style={{
                  padding: "0.3rem 0.8rem",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: selectedCat === c._id ? "var(--accent)" : "var(--bg2)",
                  color: selectedCat === c._id ? "#fff" : "var(--text2)",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  transition: "all var(--transition)"
                }}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {loading ? (
            <div style={{ color: "var(--text3)", textAlign: "center", padding: "2rem" }}>Loading products…</div>
          ) : (
            <div className="pos-product-grid">
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", color: "var(--text3)", textAlign: "center", padding: "2rem" }}>No products found</div>
              )}
              {filtered.map(p => (
                <div
                  key={p._id}
                  className={`pos-product-card${p.stockQuantity === 0 ? " out-of-stock" : ""}`}
                  onClick={() => addToCart(p)}
                >
                  {/* Product image or emoji fallback */}
                  <div style={{
                    width: "100%", height: 72, borderRadius: "0.5rem",
                    overflow: "hidden", marginBottom: "0.35rem",
                    background: "var(--bg2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2rem", lineHeight: 1, flexShrink: 0
                  }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : foodEmoji(p.name)
                    }
                  </div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.3, textAlign: "center" }}>{p.name}</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent)" }}>{fmt(p.price)}</div>
                  <div style={{
                    fontSize: "0.65rem",
                    color: p.stockQuantity === 0 ? "var(--red)" : p.stockQuantity <= (p.reorderLevel || 10) ? "var(--amber)" : "var(--green)",
                    fontWeight: 600
                  }}>
                    {p.stockQuantity === 0 ? "Out of stock" : `${p.stockQuantity} left`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Cart */}
        <div className="pos-cart">
          {/* Cart Header */}
          <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem" }}>Cart</span>
              {cart.length > 0 && (
                <span style={{
                  background: "var(--accent)",
                  color: "#fff",
                  borderRadius: "999px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.1rem 0.5rem",
                  minWidth: 20,
                  textAlign: "center"
                }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                style={{ fontSize: "0.75rem", color: "var(--text3)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="pos-cart-items">
            {cart.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🛒</div>
                <div style={{ fontSize: "0.85rem" }}>Cart is empty</div>
              </div>
            )}
            {cart.map(item => (
              <div key={item.product} className="pos-cart-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                  <div style={{ color: "var(--text3)", fontSize: "0.72rem" }}>{fmt(item.price)} each</div>
                </div>
                <div className="qty-ctrl">
                  <button className="qty-btn" onClick={() => updateQty(item.product, item.quantity - 1)}>−</button>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.product, item.quantity + 1)}>+</button>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent)", flexShrink: 0, minWidth: 60, textAlign: "right" }}>
                  {fmt(item.price * item.quantity)}
                </div>
                <button
                  onClick={() => removeItem(item.product)}
                  style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "1rem", flexShrink: 0, padding: "0 0.2rem" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Cart Footer */}
          <div className="pos-cart-footer" style={{ padding: "0.875rem 1rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.6rem", flexShrink: 0 }}>
            {/* Subtotal */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text2)" }}>
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>

            {/* Discount */}
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <select
                value={discountType}
                onChange={e => { setDiscountType(e.target.value); setDiscountValue(""); }}
                style={{ fontSize: "0.78rem", padding: "0.3rem 0.4rem", flex: 1 }}
              >
                <option value="none">No Discount</option>
                <option value="percent">% Off</option>
                <option value="fixed">Fixed Off</option>
              </select>
              {discountType !== "none" && (
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "%" : "₱"}
                  style={{ fontSize: "0.78rem", padding: "0.3rem 0.4rem", width: 70 }}
                />
              )}
            </div>
            {discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--red)" }}>
                <span>Discount</span>
                <span>- {fmt(discountAmount)}</span>
              </div>
            )}

            {/* Tax */}
            {taxRate > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text2)" }}>
                <span>Tax ({taxRate}%)</span>
                <span>{fmt(taxAmt)}</span>
              </div>
            )}

            {/* Total */}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
              <span style={{ fontWeight: 800, fontSize: "1rem" }}>TOTAL</span>
              <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--accent)" }}>{fmt(total)}</span>
            </div>

            {/* Payment Method */}
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {["cash", "gcash", "card"].map(m => (
                <button
                  key={m}
                  className={`pay-tab${paymentMethod === m ? " active" : ""}`}
                  onClick={() => setPaymentMethod(m)}
                >
                  {m === "cash" ? "💵 Cash" : m === "gcash" ? "📱 GCash" : "💳 Card"}
                </button>
              ))}
            </div>

            {/* Amount Received (cash only) */}
            {paymentMethod === "cash" && (
              <>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: "0.25rem" }}>Amount Received</div>
                  <input
                    type="number"
                    min={total}
                    value={amountReceived}
                    onChange={e => setAmountReceived(e.target.value)}
                    placeholder={fmt(total)}
                    style={{ fontSize: "0.9rem" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--text2)" }}>Change</span>
                  <span style={{ fontWeight: 700, color: change >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(change)}</span>
                </div>
              </>
            )}

            {/* Notes */}
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              style={{ fontSize: "0.78rem", resize: "none" }}
            />

            {/* Checkout Button */}
            <button
              className="btn primary"
              onClick={handleCheckout}
              disabled={cart.length === 0 || submitting || (paymentMethod === "cash" && amountReceived !== "" && received < total)}
              style={{ width: "100%", padding: "0.875rem", fontSize: "0.95rem", fontWeight: 700 }}
            >
              {submitting ? "Processing…" : `Complete Sale — ${fmt(total)}`}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PosPage;
