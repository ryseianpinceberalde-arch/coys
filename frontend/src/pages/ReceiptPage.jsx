import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import api, { resolveAssetUrl } from "../utils/api";

const PAYMENT_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  qrph: "GCash QR",
  card: "Card",
  stripe: "Stripe",
  mixed: "Mixed"
};

const formatPaymentMethodLabel = (paymentMethod) =>
  PAYMENT_LABELS[String(paymentMethod || "").toLowerCase()] || String(paymentMethod || "N/A").toUpperCase();

const ReceiptPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [saleRes, settingsRes] = await Promise.all([
          api.get(`/sales/${id}`),
          api.get("/settings")
        ]);

        if (cancelled) {
          return;
        }

        setSale(saleRes.data);
        setSettings({
          ...settingsRes.data,
          logoUrl: resolveAssetUrl(settingsRes.data.logoUrl),
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(err.response?.data?.message || "Failed to load receipt");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <Layout>
        <div className="centered">
          <div className="spinner" />
          <div style={{ color: "var(--text3)" }}>Loading receipt...</div>
        </div>
      </Layout>
    );
  }

  if (error || !sale || !settings) {
    return (
      <Layout>
        <div className="centered" style={{ flexDirection: "column", gap: "0.9rem", textAlign: "center" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>Receipt unavailable</div>
          <div style={{ color: "var(--text3)", maxWidth: 360 }}>
            {error || "We could not load this receipt right now."}
          </div>
          <button className="btn primary" onClick={() => navigate("/transactions")}>
            Back to History
          </button>
        </div>
      </Layout>
    );
  }

  const fmt = (n) => `${Number(n || 0).toFixed(2)}`;
  const date = new Date(sale.createdAt);
  const dateStr = date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
  const timeStr = date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
  const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const statusLabel = String(sale.status || "completed").toUpperCase();
  const paymentStatusLabel = String(sale.paymentStatus || "paid").toUpperCase();
  const showStatusBanner = sale.status && sale.status !== "completed";
  const canContinuePayment = Boolean(sale.paymentUrl && sale.paymentStatus !== "paid");

  const openPayment = () => {
    if (!sale.paymentUrl) {
      return;
    }

    window.open(sale.paymentUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Layout>
      <div className="receipt-page-actions no-print">
        <button className="btn primary" onClick={handlePrint}>
          Print Receipt
        </button>
        <button className="btn btn-ghost" onClick={() => navigate("/pos")}>
          New Sale
        </button>
        <button className="btn btn-ghost" onClick={() => navigate("/transactions")}>
          History
        </button>
        {canContinuePayment && (
          <button className="btn btn-ghost" onClick={openPayment}>
            Continue Payment
          </button>
        )}
      </div>

      <div className="thermal-receipt">
        <div className="receipt-header">
          {settings.logoUrl && (
            <img src={settings.logoUrl} alt="" className="receipt-logo" />
          )}
          <div className="receipt-store-name">{settings.name || "Store"}</div>
          {settings.address && <div className="receipt-info">{settings.address}</div>}
          {settings.phone && <div className="receipt-info">Tel: {settings.phone}</div>}
          {settings.email && <div className="receipt-info">{settings.email}</div>}
        </div>

        {showStatusBanner && (
          <div className={`receipt-status receipt-status--${sale.status}`}>
            {statusLabel}
          </div>
        )}

        <div className="receipt-dashed" />

        <div className="receipt-meta">
          <div className="receipt-meta-row">
            <span>Invoice:</span>
            <span>{sale.invoiceNumber}</span>
          </div>
          <div className="receipt-meta-row">
            <span>Date:</span>
            <span>{dateStr}</span>
          </div>
          <div className="receipt-meta-row">
            <span>Time:</span>
            <span>{timeStr}</span>
          </div>
          <div className="receipt-meta-row">
            <span>Cashier:</span>
            <span>{sale.cashier?.name || "-"}</span>
          </div>
          <div className="receipt-meta-row">
            <span>Status:</span>
            <span>{statusLabel}</span>
          </div>
          <div className="receipt-meta-row">
            <span>Payment:</span>
            <span>{paymentStatusLabel}</span>
          </div>
          {sale.paymentPaidAt && (
            <div className="receipt-meta-row">
              <span>Paid At:</span>
              <span>{new Date(sale.paymentPaidAt).toLocaleString()}</span>
            </div>
          )}
          {sale.customer && (
            <div className="receipt-meta-row">
              <span>Customer:</span>
              <span>{sale.customer.name}</span>
            </div>
          )}
        </div>

        <div className="receipt-dashed" />

        <div className="receipt-items-header">
          <span style={{ flex: 1 }}>Item</span>
          <span style={{ width: 30, textAlign: "center" }}>Qty</span>
          <span style={{ width: 65, textAlign: "right" }}>Price</span>
          <span style={{ width: 70, textAlign: "right" }}>Amount</span>
        </div>

        <div className="receipt-solid" />

        <div className="receipt-items">
          {sale.items.map((item, index) => (
            <div key={`${sale._id}-${index}`} className="receipt-item">
              <span className="receipt-item-name">{item.name}</span>
              <div className="receipt-item-row">
                <span style={{ flex: 1 }} />
                <span style={{ width: 30, textAlign: "center" }}>{item.quantity}</span>
                <span style={{ width: 65, textAlign: "right" }}>{fmt(item.price)}</span>
                <span style={{ width: 70, textAlign: "right" }}>{fmt(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="receipt-solid" />

        <div className="receipt-totals">
          <div className="receipt-total-row">
            <span>Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})</span>
            <span>{fmt(sale.subtotal)}</span>
          </div>

          {sale.discountAmount > 0 && (
            <div className="receipt-total-row">
              <span>Discount {sale.discountType === "percent" ? `(${sale.discountValue}%)` : ""}</span>
              <span>-{fmt(sale.discountAmount)}</span>
            </div>
          )}

          {sale.tax > 0 && (
            <div className="receipt-total-row">
              <span>Tax ({sale.taxRate}%)</span>
              <span>{fmt(sale.tax)}</span>
            </div>
          )}

          <div className="receipt-dashed" />

          <div className="receipt-total-row receipt-grand-total">
            <span>TOTAL</span>
            <span>PHP {fmt(sale.total)}</span>
          </div>

          <div className="receipt-dashed" />

          <div className="receipt-total-row">
            <span>Payment ({formatPaymentMethodLabel(sale.paymentMethod)})</span>
            <span>{fmt(sale.paymentReceived)}</span>
          </div>

          <div className="receipt-total-row">
            <span>Payment Status</span>
            <span>{paymentStatusLabel}</span>
          </div>

          {sale.paymentMethod === "cash" && (
            <div className="receipt-total-row">
              <span>Change</span>
              <span>{fmt(sale.change)}</span>
            </div>
          )}
        </div>

        {sale.notes && (
          <>
            <div className="receipt-dashed" />
            <div className="receipt-notes">Note: {sale.notes}</div>
          </>
        )}

        <div className="receipt-dashed" />

        <div className="receipt-footer">
          {settings.receiptFooter && <div>{settings.receiptFooter}</div>}
          <div className="receipt-thankyou">*** THANK YOU ***</div>
        </div>
      </div>
    </Layout>
  );
};

export default ReceiptPage;
