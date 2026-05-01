import React, { useState, useEffect } from "react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../utils/api";

const emptyForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  isActive: true
};

const SuppliersPage = () => {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contactPerson || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      contactPerson: s.contactPerson || "",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      notes: s.notes || "",
      isActive: s.isActive
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/suppliers/${editing._id}`, form);
        toast.success("Supplier updated");
      } else {
        await api.post("/suppliers", form);
        toast.success("Supplier created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/suppliers/${deleteTarget._id}`);
      toast.success("Supplier moved to archive");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to archive");
    }
  };

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <Layout>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Suppliers</h1>
          <p className="text-muted">Manage product suppliers ({suppliers.length} total)</p>
        </div>
        <button className="btn primary" onClick={openCreate}>+ Add Supplier</button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input
          placeholder="Search suppliers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact Person</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>Loading…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>No suppliers found</td>
              </tr>
            )}
            {filtered.map(s => (
              <tr key={s._id}>
                <td style={{ fontWeight: 600, color: "var(--text)" }}>{s.name}</td>
                <td style={{ color: "var(--text2)" }}>{s.contactPerson || "—"}</td>
                <td style={{ color: "var(--text2)" }}>{s.email || "—"}</td>
                <td style={{ color: "var(--text2)" }}>{s.phone || "—"}</td>
                <td>
                  <span className={`badge ${s.isActive ? "badge-green" : "badge-red"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button className="btn btn-sm" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(s)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "Add Supplier"} size="md">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Supplier Name *</label>
            <input value={form.name} onChange={set("name")} required placeholder="e.g. Metro Wholesale" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Contact Person</label>
            <input value={form.contactPerson} onChange={set("contactPerson")} placeholder="Full name" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Email</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="email@example.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Phone</label>
              <input value={form.phone} onChange={set("phone")} placeholder="09XXXXXXXXX" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Address</label>
            <textarea
              value={form.address}
              onChange={set("address")}
              placeholder="Full address"
              rows={2}
              style={{ resize: "vertical" }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              placeholder="Additional notes"
              rows={2}
              style={{ resize: "vertical" }}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              style={{ width: "auto", marginTop: 0 }}
            />
            Active
          </label>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary btn-sm">{editing ? "Update" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Archive Supplier"
        message={`Move "${deleteTarget?.name}" to Archive? You can restore it later.`}
        confirmLabel="Move to Archive"
      />
    </Layout>
  );
};

export default SuppliersPage;
