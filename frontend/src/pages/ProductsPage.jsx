import React, { useEffect, useState, useCallback, useRef } from "react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Pagination from "../components/Pagination.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../utils/api";

const UNITS = ["pcs", "kg", "g", "L", "mL", "box", "pack", "bottle", "can", "dozen"];

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  price: "",
  costPrice: "",
  stockQuantity: "",
  reorderLevel: "10",
  unit: "pcs",
  barcode: "",
  description: "",
  isActive: true,
  imageUrl: ""
};

const fmt = (n) => `₱${Number(n || 0).toFixed(2)}`;

const ProductsPage = () => {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, brandRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/brands")
      ]);
      const prods = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.products || []);
      setProducts(prods);
      setCategories(catRes.data);
      setBrands(brandRes.data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.barcode || "").includes(q);
    const matchCat = !filterCat || p.category?._id === filterCat || p.category === filterCat;
    const matchBrand = !filterBrand || p.brand?._id === filterBrand || p.brand === filterBrand;
    const matchStatus = filterStatus === "all"
      ? true
      : filterStatus === "active" ? p.isActive && !p.isArchived
      : filterStatus === "inactive" ? !p.isActive
      : !p.isArchived;
    return matchSearch && matchCat && matchBrand && matchStatus;
  });

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku || "",
      category: p.category?._id || p.category || "",
      brand: p.brand?._id || p.brand || "",
      price: String(p.price),
      costPrice: String(p.costPrice || ""),
      stockQuantity: String(p.stockQuantity),
      reorderLevel: String(p.reorderLevel || 10),
      unit: p.unit || "pcs",
      barcode: p.barcode || "",
      description: p.description || "",
      isActive: p.isActive,
      imageUrl: p.imageUrl || ""
    });
    setImageFile(null);
    setImagePreview(p.imageUrl || "");
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setForm(f => ({ ...f, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Always use FormData so multer can handle optional file
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("category", form.category);
      fd.append("price", parseFloat(form.price));
      fd.append("stockQuantity", parseInt(form.stockQuantity));
      fd.append("costPrice", parseFloat(form.costPrice || 0));
      fd.append("reorderLevel", parseInt(form.reorderLevel || 10));
      fd.append("unit", form.unit);
      fd.append("isActive", form.isActive);
      if (form.sku) fd.append("sku", form.sku);
      if (form.barcode) fd.append("barcode", form.barcode);
      if (form.brand) fd.append("brand", form.brand);
      if (form.description) fd.append("description", form.description);
      // Keep existing image URL if no new file
      if (imageFile) {
        fd.append("image", imageFile);
      } else {
        fd.append("imageUrl", form.imageUrl || "");
      }

      if (editing) {
        await api.put(`/products/${editing._id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Product updated");
      } else {
        await api.post("/products", fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Product created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleteTarget._id}`);
      toast.success("Product moved to archive");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to archive");
    }
  };

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setCheck = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.checked }));

  const stockColor = (p) => {
    if (p.stockQuantity === 0) return "var(--red)";
    if (p.stockQuantity <= (p.reorderLevel || 10)) return "var(--amber)";
    return "var(--green)";
  };

  return (
    <Layout>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Products</h1>
          <p className="text-muted">Showing {filtered.length} of {products.length} products</p>
        </div>
        <button className="btn primary" onClick={openCreate}>+ Add Product</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search name, SKU, barcode…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: 240 }}
        />
        <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filterBrand} onChange={e => { setFilterBrand(e.target.value); setPage(1); }}>
          <option value="">All Brands</option>
          {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 56 }}>Img</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Price</th>
              <th>Cost</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>Loading…</td></tr>
            )}
            {!loading && paged.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>No products found</td></tr>
            )}
            {paged.map(p => (
              <tr key={p._id}>
                <td>
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "0.375rem", border: "1px solid var(--border)" }} />
                    : <div style={{ width: 40, height: 40, borderRadius: "0.375rem", background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🛒</div>
                  }
                </td>
                <td style={{ fontWeight: 600, color: "var(--text)" }}>{p.name}</td>
                <td style={{ color: "var(--text3)", fontFamily: "monospace", fontSize: "0.8rem" }}>{p.sku || "—"}</td>
                <td style={{ color: "var(--text2)" }}>{p.category?.name || "—"}</td>
                <td style={{ color: "var(--text2)" }}>{p.brand?.name || "—"}</td>
                <td style={{ fontWeight: 600 }}>{fmt(p.price)}</td>
                <td style={{ color: "var(--text2)" }}>{fmt(p.costPrice)}</td>
                <td>
                  <span style={{ fontWeight: 700, color: stockColor(p) }}>{p.stockQuantity}</span>
                </td>
                <td>
                  <span className={`badge ${p.isActive ? "badge-green" : "badge-amber"}`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button className="btn btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(p)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Product Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"} size="lg">
        <form onSubmit={handleSubmit}>

          {/* Image Upload */}
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--text2)" }}>
              Product Image
            </label>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              {/* Preview box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 100, height: 100, flexShrink: 0,
                  border: `2px dashed ${imagePreview ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "0.75rem", overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", background: "var(--bg2)", position: "relative",
                  transition: "border-color 0.2s"
                }}
              >
                {imagePreview
                  ? <img src={imagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ textAlign: "center", color: "var(--text3)", fontSize: "0.78rem", padding: "0.5rem" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>📷</div>
                      Click to upload
                    </div>
                }
              </div>
              {/* Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", justifyContent: "center" }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: "0.82rem" }}
                >
                  {imagePreview ? "Change Image" : "Upload Image"}
                </button>
                {imagePreview && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={removeImage}
                    style={{ fontSize: "0.82rem" }}
                  >
                    Remove
                  </button>
                )}
                <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
                  JPG, PNG, WebP — max 5 MB
                </span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem", marginBottom: "0.9rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Name *</label>
              <input value={form.name} onChange={set("name")} required placeholder="Product name" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>SKU</label>
              <input value={form.sku} onChange={set("sku")} placeholder="e.g. CC-001" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Category *</label>
              <select value={form.category} onChange={set("category")} required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Brand</label>
              <select value={form.brand} onChange={set("brand")}>
                <option value="">No brand</option>
                {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Selling Price *</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={set("price")} required placeholder="0.00" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Cost Price</label>
              <input type="number" min="0" step="0.01" value={form.costPrice} onChange={set("costPrice")} placeholder="0.00" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Stock Quantity *</label>
              <input type="number" min="0" value={form.stockQuantity} onChange={set("stockQuantity")} required placeholder="0" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Reorder Level</label>
              <input type="number" min="0" value={form.reorderLevel} onChange={set("reorderLevel")} placeholder="10" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Unit</label>
              <select value={form.unit} onChange={set("unit")}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Barcode</label>
              <input value={form.barcode} onChange={set("barcode")} placeholder="Barcode number" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "0.9rem" }}>
            <label>Description</label>
            <textarea value={form.description} onChange={set("description")} rows={2} placeholder="Product description (optional)" style={{ resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.25rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
              <input type="checkbox" checked={form.isActive} onChange={setCheck("isActive")} style={{ width: "auto", marginTop: 0 }} />
              Active
            </label>
          </div>

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
        title="Archive Product"
        message={`Move "${deleteTarget?.name}" to Archive? You can restore it later.`}
        confirmLabel="Move to Archive"
      />
    </Layout>
  );
};

export default ProductsPage;
