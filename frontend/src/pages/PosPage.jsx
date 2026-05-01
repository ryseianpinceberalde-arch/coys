import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import Modal from "../components/Modal.jsx";
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
const PAYMENT_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  qrph: "GCash QR",
  card: "Card",
  stripe: "Stripe"
};
const isHostedPosPaymentMethod = (paymentMethod) =>
  ["gcash", "qrph", "card", "stripe"].includes(String(paymentMethod || "").toLowerCase());

const stripeQrCodeUrl = (paymentUrl) =>
  paymentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(paymentUrl)}`
    : "";

const buildStripeReturnUrl = (status, includeSessionId = false) => {
  if (typeof window === "undefined" || !window.location?.origin) {
    return "";
  }

  const base = `${window.location.origin}/api/payments/stripe/return?status=${encodeURIComponent(status)}&source=pos`;
  return includeSessionId ? `${base}&session_id={CHECKOUT_SESSION_ID}` : base;
};

const paymentStatusBadge = (status) => {
  if (status === "paid") return "badge-green";
  if (status === "pending") return "badge-amber";
  if (status === "expired" || status === "failed") return "badge-red";
  return "badge-blue";
};

const formatPaymentStatus = (status) =>
  String(status || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());

const PosPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState(emptyCart);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [checkoutPaymentMethods, setCheckoutPaymentMethods] = useState(["cash"]);
  const [amountReceived, setAmountReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stripeSale, setStripeSale] = useState(null);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [syncingStripeSale, setSyncingStripeSale] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [prodRes, catRes, settingsRes] = await Promise.all([
        api.get("/products?limit=500"),
        api.get("/categories"),
        api.get("/settings").catch(() => ({ data: { taxRate: 0 } }))
      ]);
      const prods = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.products || []);
      const configuredCheckoutMethods = Array.isArray(settingsRes.data?.paymentMethods)
        ? settingsRes.data.paymentMethods
        : ["cash"];
      setProducts(prods.filter(p => p.isActive && !p.isArchived));
      setCategories(catRes.data);
      setTaxRate(settingsRes.data.taxRate || 0);
      setCheckoutPaymentMethods(configuredCheckoutMethods);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const availablePaymentMethods = useMemo(() => {
    const configured = Array.isArray(checkoutPaymentMethods) && checkoutPaymentMethods.length
      ? checkoutPaymentMethods
      : ["cash"];
    const preferredOrder = ["cash", "gcash", "qrph", "card", "stripe"];

    return preferredOrder.filter((method) => configured.includes(method));
  }, [checkoutPaymentMethods]);

  useEffect(() => {
    if (availablePaymentMethods.includes(paymentMethod)) {
      return;
    }

    setPaymentMethod("cash");
  }, [availablePaymentMethods, paymentMethod]);

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

  const syncStripeSale = useCallback(async ({ silent = false } = {}) => {
    if (!stripeSale?._id) {
      return null;
    }

    if (!silent) {
      setSyncingStripeSale(true);
    }

    try {
      const res = await api.get(`/sales/${stripeSale._id}`);
      const nextSale = res.data;

      setStripeSale(nextSale);

      if (nextSale.paymentStatus === "paid" || nextSale.status === "completed") {
        setStripeModalOpen(false);
        setStripeSale(null);
        toast.success(`Payment received for ${nextSale.invoiceNumber}`);
        await loadData();
        navigate(`/receipt/${nextSale._id}`);
      }

      return nextSale;
    } catch (err) {
      if (!silent) {
        toast.error(err.response?.data?.message || "Unable to refresh Stripe payment status");
      }

      return null;
    } finally {
      if (!silent) {
        setSyncingStripeSale(false);
      }
    }
  }, [loadData, navigate, stripeSale?._id, toast]);

  useEffect(() => {
    if (!stripeModalOpen || !stripeSale?._id || stripeSale.paymentStatus === "paid") {
      return undefined;
    }

    syncStripeSale({ silent: true });

    const interval = window.setInterval(() => {
      syncStripeSale({ silent: true });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [stripeModalOpen, stripeSale?._id, stripeSale?.paymentStatus, syncStripeSale]);

  const openStripeCheckout = useCallback(() => {
    if (!stripeSale?.paymentUrl) {
      return;
    }

    window.open(stripeSale.paymentUrl, "_blank", "noopener,noreferrer");
  }, [stripeSale?.paymentUrl]);

  const copyStripeCheckoutLink = useCallback(async () => {
    if (!stripeSale?.paymentUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(stripeSale.paymentUrl);
      toast.success("Payment link copied");
    } catch {
      toast.error("Unable to copy the payment link");
    }
  }, [stripeSale?.paymentUrl, toast]);

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
        paymentReceived: paymentMethod === "cash" ? received : isHostedPosPaymentMethod(paymentMethod) ? 0 : total,
        notes,
        ...(paymentMethod === "stripe"
          ? {
              successUrl: buildStripeReturnUrl("success", true),
              cancelUrl: buildStripeReturnUrl("cancel")
            }
          : {})
      });

      if (isHostedPosPaymentMethod(paymentMethod)) {
        setStripeSale(res.data);
        setStripeModalOpen(true);
        toast.info(`Invoice ${res.data.invoiceNumber} is waiting for ${PAYMENT_LABELS[paymentMethod] || "online"} payment`);
        clearCart();
        loadData();
        return;
      }

      toast.success(`Sale complete! Invoice: ${res.data.invoiceNumber}`);
      clearCart();
      loadData();
      navigate(`/receipt/${res.data._id}`);
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
                color: selectedCat === "all" ? "var(--accent-ink)" : "var(--text2)",
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
                  color: selectedCat === c._id ? "var(--accent-ink)" : "var(--text2)",
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
                  color: "var(--accent-ink)",
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
              {availablePaymentMethods.map(m => (
                <button
                  key={m}
                  className={`pay-tab${paymentMethod === m ? " active" : ""}`}
                  onClick={() => setPaymentMethod(m)}
                >
                  {PAYMENT_LABELS[m] || m}
                </button>
              ))}
            </div>

            {isHostedPosPaymentMethod(paymentMethod) && (
              <div style={{ fontSize: "0.78rem", color: "var(--text3)", lineHeight: 1.5 }}>
                {`${PAYMENT_LABELS[paymentMethod] || "Online"} creates a hosted checkout link for this sale. Show the QR code or open the payment page for the customer.`}
              </div>
            )}

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
              {submitting
                ? "Processing..."
                : isHostedPosPaymentMethod(paymentMethod)
                  ? `Create ${PAYMENT_LABELS[paymentMethod] || "Online"} Checkout - ${fmt(total)}`
                  : `Complete Sale - ${fmt(total)}`}
            </button>
          </div>
        </div>
      </div>
      <Modal
        isOpen={stripeModalOpen}
        onClose={() => setStripeModalOpen(false)}
        title={stripeSale ? `${PAYMENT_LABELS[stripeSale.paymentMethod] || "Online"} Checkout: ${stripeSale.invoiceNumber}` : "Online Checkout"}
        size="md"
      >
        {stripeSale && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>INVOICE</div>
                <div style={{ fontWeight: 800, fontSize: "1rem" }}>{stripeSale.invoiceNumber}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "var(--text3)", fontSize: "0.75rem", marginBottom: "0.2rem" }}>TOTAL</div>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--accent)" }}>{fmt(stripeSale.total)}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <span className={`badge ${paymentStatusBadge(stripeSale.paymentStatus)}`}>
                {formatPaymentStatus(stripeSale.paymentStatus)}
              </span>
              <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>
                This sale stays pending until the payment provider confirms payment.
              </span>
            </div>

            <div style={{ color: "var(--text2)", lineHeight: 1.6 }}>
              {stripeSale.paymentMethod === "gcash"
                ? "Have the customer scan this QR code with their phone. It opens the GCash checkout page so they can pay immediately."
                : stripeSale.paymentMethod === "qrph"
                  ? "Have the customer scan this QR code with GCash or another QR Ph wallet to complete payment."
                : stripeSale.paymentMethod === "card"
                  ? "Open this hosted card checkout on the customer's device, or let them scan the QR code to continue on their phone."
                  : "Have the customer scan this QR code with their phone. It opens the hosted checkout so they can pay without typing the link manually."}
            </div>

            {stripeSale.paymentUrl ? (
              <div style={{ alignSelf: "center", background: "#fff", padding: "0.9rem", borderRadius: "1rem", border: "1px solid var(--border)" }}>
                <img
                  src={stripeQrCodeUrl(stripeSale.paymentUrl)}
                  alt={`${PAYMENT_LABELS[stripeSale.paymentMethod] || "Online"} checkout QR for ${stripeSale.invoiceNumber}`}
                  style={{ display: "block", width: 280, height: 280, maxWidth: "100%" }}
                />
              </div>
            ) : (
              <div style={{ padding: "1rem", borderRadius: "1rem", background: "var(--bg2)", color: "var(--text3)" }}>
                Waiting for checkout link...
              </div>
            )}

            <div style={{ color: "var(--text3)", fontSize: "0.78rem", lineHeight: 1.5 }}>
              If the QR image does not load, use the payment link below or open the checkout directly on this device.
            </div>

            <div style={{ padding: "0.9rem", borderRadius: "1rem", background: "var(--bg2)", border: "1px solid var(--border)", wordBreak: "break-all", fontSize: "0.78rem", color: "var(--text2)" }}>
              {stripeSale.paymentUrl || "No payment link available yet."}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn primary" onClick={openStripeCheckout} disabled={!stripeSale.paymentUrl}>
                {stripeSale.paymentMethod === "gcash"
                  ? "Open GCash"
                  : stripeSale.paymentMethod === "qrph"
                    ? "Open GCash QR"
                    : "Open Checkout"}
              </button>
              <button className="btn btn-ghost" onClick={copyStripeCheckoutLink} disabled={!stripeSale.paymentUrl}>
                Copy Link
              </button>
              <button className="btn btn-ghost" onClick={() => syncStripeSale()} disabled={syncingStripeSale}>
                {syncingStripeSale ? "Refreshing..." : "Refresh Status"}
              </button>
            </div>

            <div style={{ color: "var(--text3)", fontSize: "0.78rem", lineHeight: 1.5 }}>
              Closing this dialog does not cancel the sale. You can reopen the pending payment from History until it is paid or cancelled.
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default PosPage;
