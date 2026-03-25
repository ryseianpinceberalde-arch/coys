import React, { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import api from "../utils/api";

const SettingsPage = () => {
  const toast = useToast();
  const { settings, refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [storeForm, setStoreForm] = useState({
    name: "", address: "", phone: "", email: "", currency: "PHP"
  });
  const [receiptForm, setReceiptForm] = useState({ taxRate: "", receiptFooter: "" });

  // Logo state
  const [logoFile, setLogoFile]       = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const logoInputRef = useRef(null);

  useEffect(() => {
    api.get("/settings")
      .then(res => {
        const d = res.data;
        setStoreForm({
          name: d.name || "",
          address: d.address || "",
          phone: d.phone || "",
          email: d.email || "",
          currency: d.currency || "PHP"
        });
        setReceiptForm({ taxRate: String(d.taxRate ?? ""), receiptFooter: d.receiptFooter || "" });
        setLogoPreview(d.logoUrl || "");
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Logo handlers ── */
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = async () => {
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) logoInputRef.current.value = "";
    // Persist the removal immediately
    try {
      const fd = new FormData();
      fd.append("logoUrl", "");
      await api.put("/settings", fd);
      refreshSettings();
      toast.success("Logo removed");
    } catch { toast.error("Failed to remove logo"); }
  };

  const saveLogo = async () => {
    if (!logoFile) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("logo", logoFile);
      await api.put("/settings", fd, { headers: { "Content-Type": "multipart/form-data" } });
      refreshSettings();
      toast.success("Logo updated");
      setLogoFile(null);
    } catch { toast.error("Failed to upload logo"); }
    finally { setSaving(false); }
  };

  /* ── Store info ── */
  const saveStore = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(storeForm).forEach(([k, v]) => fd.append(k, v));
      await api.put("/settings", fd);
      refreshSettings();
      toast.success("Store information saved");
    } catch { toast.error("Failed to save store info"); }
    finally { setSaving(false); }
  };

  /* ── Receipt / tax ── */
  const saveReceipt = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("taxRate", parseFloat(receiptForm.taxRate || 0));
      fd.append("receiptFooter", receiptForm.receiptFooter);
      await api.put("/settings", fd);
      refreshSettings();
      toast.success("Receipt settings saved");
    } catch { toast.error("Failed to save receipt settings"); }
    finally { setSaving(false); }
  };

  const setStore   = (k) => (e) => setStoreForm(f => ({ ...f, [k]: e.target.value }));
  const setReceipt = (k) => (e) => setReceiptForm(f => ({ ...f, [k]: e.target.value }));

  if (loading) return (
    <Layout>
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text3)" }}>Loading settings…</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="page-header">
        <h1>Settings</h1>
        <p className="text-muted">Configure your store</p>
      </div>

      {/* ── Logo Upload ── */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "1.25rem", fontSize: "1rem", fontWeight: 700 }}>🖼️ Store Logo</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>

          {/* Preview circle */}
          <div
            onClick={() => logoInputRef.current?.click()}
            style={{
              width: 110, height: 110, flexShrink: 0,
              border: `2px dashed ${logoPreview ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "1rem", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", background: "var(--bg2)",
              transition: "border-color 0.2s"
            }}
          >
            {logoPreview
              ? <img src={logoPreview} alt="logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.78rem", padding: "0.5rem" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>🍽️</div>
                  Click to upload
                </div>
            }
          </div>

          {/* Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <p style={{ color: "var(--text2)", fontSize: "0.875rem", margin: 0 }}>
              This logo appears in the sidebar and on receipts.<br />
              Recommended: square image, at least 200×200 px.
            </p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button className="btn btn-sm" onClick={() => logoInputRef.current?.click()}>
                {logoPreview ? "Change Logo" : "Upload Logo"}
              </button>
              {logoFile && (
                <button
                  className="btn primary btn-sm"
                  onClick={saveLogo}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Logo"}
                </button>
              )}
              {logoPreview && !logoFile && (
                <button className="btn btn-sm btn-danger" onClick={removeLogo}>
                  Remove Logo
                </button>
              )}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
              JPG, PNG, WebP — max 2 MB
            </span>
          </div>
        </div>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleLogoChange}
          style={{ display: "none" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Store Information ── */}
        <div className="card">
          <h2 style={{ marginBottom: "1.25rem", fontSize: "1rem", fontWeight: 700 }}>🏪 Store Information</h2>
          <form onSubmit={saveStore} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Store Name</label>
              <input value={storeForm.name} onChange={setStore("name")} placeholder="Coy's Corner" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Store Address</label>
              <textarea value={storeForm.address} onChange={setStore("address")} rows={2} placeholder="123 Main St, City" style={{ resize: "vertical" }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Phone</label>
              <input value={storeForm.phone} onChange={setStore("phone")} placeholder="09XXXXXXXXX" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Email</label>
              <input type="email" value={storeForm.email} onChange={setStore("email")} placeholder="store@example.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Currency</label>
              <select value={storeForm.currency} onChange={setStore("currency")}>
                <option value="PHP">PHP — Philippine Peso</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn primary btn-sm" disabled={saving}>
                {saving ? "Saving…" : "Save Store Info"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Receipt & Tax ── */}
        <div className="card">
          <h2 style={{ marginBottom: "1.25rem", fontSize: "1rem", fontWeight: 700 }}>🧾 Receipt &amp; Tax Settings</h2>
          <form onSubmit={saveReceipt} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tax Rate (%)</label>
              <input
                type="number" min="0" max="100" step="0.1"
                value={receiptForm.taxRate}
                onChange={setReceipt("taxRate")}
                placeholder="0"
              />
              <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginTop: "0.25rem" }}>Set to 0 to disable tax</div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Receipt Footer</label>
              <textarea
                value={receiptForm.receiptFooter}
                onChange={setReceipt("receiptFooter")}
                rows={3}
                placeholder="Thank you for your purchase!"
                style={{ resize: "vertical" }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginTop: "0.25rem" }}>Shown at the bottom of receipts</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn primary btn-sm" disabled={saving}>
                {saving ? "Saving…" : "Save Receipt Settings"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
