import React, { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import api, { downloadAuthenticatedFile, resolveAssetUrl } from "../utils/api";
import { normalizeStaffPermissions, STAFF_PERMISSION_OPTIONS } from "../utils/staffPermissions.js";

const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.message || fallbackMessage;

const SettingsPage = () => {
  const toast = useToast();
  const { refreshSettings } = useSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [loadingStaffUsers, setLoadingStaffUsers] = useState(false);
  const [savingStaffId, setSavingStaffId] = useState("");
  const [staffUsers, setStaffUsers] = useState([]);

  const [storeForm, setStoreForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    currency: "PHP",
  });
  const [receiptForm, setReceiptForm] = useState({ taxRate: "", receiptFooter: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const logoInputRef = useRef(null);

  useEffect(() => {
    api
      .get("/settings")
      .then((res) => {
        const data = res.data;
        setStoreForm({
          name: data.name || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          currency: data.currency || "PHP",
        });
        setReceiptForm({
          taxRate: String(data.taxRate ?? ""),
          receiptFooter: data.receiptFooter || "",
        });
        setLogoPreview(resolveAssetUrl(data.logoUrl));
      })
      .catch((error) => toast.error(getErrorMessage(error, "Failed to load settings")))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (!isAdmin) {
      setStaffUsers([]);
      return;
    }

    setLoadingStaffUsers(true);
    api
      .get("/users")
      .then((res) => {
        const nextStaffUsers = (Array.isArray(res.data) ? res.data : [])
          .filter((entry) => entry.role === "staff")
          .map((entry) => ({
            id: String(entry._id || entry.id || ""),
            name: entry.name || "",
            email: entry.email || "",
            isActive: entry.isActive !== false,
            staffPermissions: normalizeStaffPermissions(entry.staffPermissions)
          }));
        setStaffUsers(nextStaffUsers);
      })
      .catch((error) => toast.error(getErrorMessage(error, "Failed to load staff navigation access")))
      .finally(() => setLoadingStaffUsers(false));
  }, [isAdmin, toast]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_LOGO_FILE_SIZE) {
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      toast.error("Logo must be 5 MB or smaller");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = async () => {
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }

    try {
      const fd = new FormData();
      fd.append("logoUrl", "");
      await api.put("/settings", fd);
      await refreshSettings();
      toast.success("Logo removed");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to remove logo"));
    }
  };

  const saveLogo = async () => {
    if (!logoFile) {
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("logo", logoFile);
      await api.put("/settings", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshSettings();
      toast.success("Logo updated");
      setLogoFile(null);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to upload logo"));
    } finally {
      setSaving(false);
    }
  };

  const saveStore = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(storeForm).forEach(([key, value]) => fd.append(key, value));
      await api.put("/settings", fd);
      await refreshSettings();
      toast.success("Store information saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save store info"));
    } finally {
      setSaving(false);
    }
  };

  const saveReceipt = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("taxRate", parseFloat(receiptForm.taxRate || 0));
      fd.append("receiptFooter", receiptForm.receiptFooter);
      await api.put("/settings", fd);
      await refreshSettings();
      toast.success("Receipt settings saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save receipt settings"));
    } finally {
      setSaving(false);
    }
  };

  const setStore = (key) => (e) => setStoreForm((form) => ({ ...form, [key]: e.target.value }));
  const setReceipt = (key) => (e) => setReceiptForm((form) => ({ ...form, [key]: e.target.value }));
  const setStaffPermission = (staffId, permissionKey) => (e) => {
    const checked = e.target.checked;
    setStaffUsers((current) =>
      current.map((staff) => (
        staff.id === staffId
          ? {
              ...staff,
              staffPermissions: {
                ...normalizeStaffPermissions(staff.staffPermissions),
                [permissionKey]: checked
              }
            }
          : staff
      ))
    );
  };

  const saveStaffPermissions = async (staff) => {
    setSavingStaffId(staff.id);
    try {
      await api.put(`/users/${staff.id}`, {
        staffPermissions: normalizeStaffPermissions(staff.staffPermissions)
      });
      toast.success(`${staff.name || "Staff"} navigation access updated`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update staff navigation access"));
    } finally {
      setSavingStaffId("");
    }
  };

  const downloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      await downloadAuthenticatedFile("/settings/backup", `database-backup-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success("Database backup downloaded");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to download database backup"));
    } finally {
      setDownloadingBackup(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text3)" }}>Loading settings...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Settings</h1>
        <p className="text-muted">Configure your store</p>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "1.25rem", fontSize: "1rem", fontWeight: 700 }}>Store Logo</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <div
            onClick={() => logoInputRef.current?.click()}
            style={{
              width: 110,
              height: 110,
              flexShrink: 0,
              border: `2px dashed ${logoPreview ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "1rem",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              background: "var(--bg2)",
              transition: "border-color 0.2s",
            }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.78rem", padding: "0.5rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>🍽️</div>
                Click to upload
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <p style={{ color: "var(--text2)", fontSize: "0.875rem", margin: 0 }}>
              This logo appears in the sidebar and on receipts.
              <br />
              Recommended: square image, at least 200x200 px.
            </p>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-sm" onClick={() => logoInputRef.current?.click()}>
                {logoPreview ? "Change Logo" : "Upload Logo"}
              </button>

              {logoFile && (
                <button type="button" className="btn primary btn-sm" onClick={saveLogo} disabled={saving}>
                  {saving ? "Saving..." : "Save Logo"}
                </button>
              )}

              {logoPreview && !logoFile && (
                <button type="button" className="btn btn-sm btn-danger" onClick={removeLogo}>
                  Remove Logo
                </button>
              )}
            </div>

            <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>JPG, PNG, WebP - max 5 MB</span>
          </div>
        </div>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleLogoChange}
          style={{ display: "none" }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        <div className="card">
          <h2 style={{ marginBottom: "1.25rem", fontSize: "1rem", fontWeight: 700 }}>Store Information</h2>
          <form onSubmit={saveStore} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Store Name</label>
              <input value={storeForm.name} onChange={setStore("name")} placeholder="Coy's Corner" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Store Address</label>
              <textarea
                value={storeForm.address}
                onChange={setStore("address")}
                rows={2}
                placeholder="123 Main St, City"
                style={{ resize: "vertical" }}
              />
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
                <option value="PHP">PHP - Philippine Peso</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn primary btn-sm" disabled={saving}>
                {saving ? "Saving..." : "Save Store Info"}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: "1.25rem", fontSize: "1rem", fontWeight: 700 }}>Receipt and Tax Settings</h2>
          <form onSubmit={saveReceipt} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
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
                {saving ? "Saving..." : "Save Receipt Settings"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ marginBottom: "0.35rem", fontSize: "1rem", fontWeight: 700 }}>Database Backup</h2>
              <p style={{ margin: 0, color: "var(--text3)", fontSize: "0.85rem", maxWidth: 560 }}>
                Download a JSON backup of the current MongoDB data so you can keep an offline restore copy.
              </p>
            </div>
            <button
              type="button"
              className="btn primary btn-sm"
              onClick={downloadBackup}
              disabled={downloadingBackup}
            >
              {downloadingBackup ? "Preparing..." : "Download Backup"}
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ marginBottom: "0.35rem", fontSize: "1rem", fontWeight: 700 }}>Staff Navigation Permissions</h2>
            <p style={{ margin: 0, color: "var(--text3)", fontSize: "0.85rem" }}>
              Enable or disable which navigation buttons each staff account can access.
            </p>
          </div>

          {loadingStaffUsers ? (
            <div style={{ padding: "1rem 0", color: "var(--text3)" }}>Loading staff navigation access...</div>
          ) : !staffUsers.length ? (
            <div style={{ padding: "1rem 0", color: "var(--text3)" }}>No staff accounts found.</div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {staffUsers.map((staff) => (
                <div
                  key={staff.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "1rem",
                    padding: "1rem",
                    background: "var(--bg2)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>{staff.name}</div>
                      <div style={{ color: "var(--text3)", fontSize: "0.84rem" }}>{staff.email}</div>
                    </div>
                    <span
                      style={{
                        alignSelf: "flex-start",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        background: staff.isActive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        color: staff.isActive ? "#22c55e" : "#ef4444",
                        border: `1px solid ${staff.isActive ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)"}`
                      }}
                    >
                      {staff.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem" }}>
                    {STAFF_PERMISSION_OPTIONS.map((option) => (
                      <label
                        key={option.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.55rem",
                          padding: "0.7rem 0.8rem",
                          borderRadius: "0.85rem",
                          border: "1px solid var(--border)",
                          background: "var(--surface)"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={normalizeStaffPermissions(staff.staffPermissions)[option.key]}
                          onChange={setStaffPermission(staff.id, option.key)}
                          disabled={savingStaffId === staff.id}
                          style={{ width: "auto", marginTop: 0 }}
                        />
                        <span style={{ color: "var(--text)", fontSize: "0.9rem", fontWeight: 600 }}>{option.label}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button
                      type="button"
                      className="btn primary btn-sm"
                      onClick={() => saveStaffPermissions(staff)}
                      disabled={savingStaffId === staff.id}
                    >
                      {savingStaffId === staff.id ? "Saving..." : "Save Access"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default SettingsPage;
