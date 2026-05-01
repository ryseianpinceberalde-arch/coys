import React, { useState, useEffect } from "react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../utils/api";

const emptyForm = { name: "", description: "", isActive: true };

const BrandsPage = () => {
  const toast = useToast();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/brands");
      setBrands(res.data);
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ name: b.name, description: b.description || "", isActive: b.isActive });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/brands/${editing._id}`, form);
        toast.success("Brand updated");
      } else {
        await api.post("/brands", form);
        toast.success("Brand created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/brands/${deleteTarget._id}`);
      toast.success("Brand moved to archive");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to archive");
    }
  };

  return (
    <Layout>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Brands</h1>
          <p className="text-muted">Manage product brands ({brands.length} total)</p>
        </div>
        <button className="btn primary" onClick={openCreate}>+ Add Brand</button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input
          placeholder="Search brands…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Brand Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>Loading…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>No brands found</td>
              </tr>
            )}
            {filtered.map(b => (
              <tr key={b._id}>
                <td style={{ fontWeight: 600, color: "var(--text)" }}>{b.name}</td>
                <td style={{ color: "var(--text2)" }}>{b.description || "—"}</td>
                <td>
                  <span className={`badge ${b.isActive ? "badge-green" : "badge-red"}`}>
                    {b.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ color: "var(--text3)" }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button className="btn btn-sm" onClick={() => openEdit(b)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(b)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Brand" : "Add Brand"}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Brand Name *</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Coca-Cola"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Description</label>
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm({ ...form, isActive: e.target.checked })}
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
        title="Archive Brand"
        message={`Move "${deleteTarget?.name}" to Archive? You can restore it later.`}
        confirmLabel="Move to Archive"
      />
    </Layout>
  );
};

export default BrandsPage;
