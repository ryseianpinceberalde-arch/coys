import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../utils/api";
import { useAuth } from "../state/AuthContext.jsx";

const emptyForm = { name: "", email: "", password: "", role: "user" };

const UsersPage = () => {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "admin";

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null); // user id being edited
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    const res = await api.get("/users");
    setUsers(res.data);
  };

  useEffect(() => { load(); }, []);

  const flash = (msg, type = "success") => {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
    else { setError(msg); setTimeout(() => setError(""), 4000); }
  };

  /* Create */
  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/users", form);
      setForm(emptyForm);
      flash("User created successfully");
      await load();
    } catch (err) {
      flash(err.response?.data?.message || "Failed to create user", "error");
    }
  };

  /* Start inline edit */
  const startEdit = (u) => {
    setEditing(u._id);
    setEditForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive });
  };

  /* Save edit */
  const saveEdit = async (id) => {
    try {
      await api.put(`/users/${id}`, editForm);
      setEditing(null);
      flash("User updated");
      await load();
    } catch (err) {
      flash(err.response?.data?.message || "Failed to update user", "error");
    }
  };

  /* Toggle active */
  const toggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      flash(`User ${!u.isActive ? "activated" : "deactivated"}`);
      await load();
    } catch (err) {
      flash(err.response?.data?.message || "Failed", "error");
    }
  };

  /* Delete (admin only) */
  const remove = async (id) => {
    if (!confirm("Permanently delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      flash("User deleted");
      await load();
    } catch (err) {
      flash(err.response?.data?.message || "Failed to delete", "error");
    }
  };

  const roleColors = { admin: "badge-red", staff: "badge-blue", user: "badge-green" };

  return (
    <Layout>
      <div className="page-header">
        <h1>{isAdmin ? "User Management" : "Customer Management"}</h1>
        <p className="text-muted">
          {isAdmin
            ? "Create and manage admin, staff, and customer accounts"
            : "Create and manage customer accounts"}
        </p>
      </div>

      {error   && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* ── Create form ── */}
        <form onSubmit={handleCreate} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <h2 style={{ marginBottom: "0.25rem" }}>Create Account</h2>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Full name</label>
            <input
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Email address</label>
            <input
              type="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {isAdmin && <option value="admin">Admin</option>}
              {isAdmin && <option value="staff">Staff</option>}
              <option value="user">Customer</option>
            </select>
          </div>

          <button type="submit" className="primary" style={{ marginTop: "0.25rem" }}>
            Create account
          </button>
        </form>

        {/* ── Users table ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0 }}>
              {isAdmin ? "All Accounts" : "Customers"}
              <span style={{
                marginLeft: "0.5rem", fontSize: "0.8rem", fontWeight: 600,
                padding: "0.15rem 0.6rem", borderRadius: "999px",
                background: "rgba(249,115,22,0.12)", color: "var(--accent)"
              }}>{users.length}</span>
            </h2>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>No accounts found</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u._id}>
                    {editing === u._id ? (
                      <>
                        <td>
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </td>
                        <td>
                          <input
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                          />
                        </td>
                        <td>
                          {isAdmin ? (
                            <select
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                              style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                            >
                              <option value="admin">Admin</option>
                              <option value="staff">Staff</option>
                              <option value="user">Customer</option>
                            </select>
                          ) : (
                            <span className={`badge ${roleColors[u.role]}`}>{u.role}</span>
                          )}
                        </td>
                        <td>
                          <select
                            value={String(editForm.isActive)}
                            onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "true" })}
                            style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </td>
                        <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          <button className="btn-sm primary" onClick={() => saveEdit(u._id)}>Save</button>
                          <button className="btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                              background: "linear-gradient(135deg,var(--accent),#ea580c)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.7rem", fontWeight: 700, color: "#fff"
                            }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            {u.name}
                          </div>
                        </td>
                        <td style={{ color: "var(--text2)" }}>{u.email}</td>
                        <td><span className={`badge ${roleColors[u.role] || "badge-gray"}`}>{u.role}</span></td>
                        <td>
                          <span className={`badge ${u.isActive ? "badge-green" : "badge-red"}`}>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <button className="btn-sm" onClick={() => startEdit(u)}>Edit</button>
                            <button
                              className="btn-sm"
                              style={{ color: u.isActive ? "var(--amber)" : "var(--green)" }}
                              onClick={() => toggleActive(u)}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                            {isAdmin && (
                              <button className="btn-sm btn-danger" onClick={() => remove(u._id)}>Delete</button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UsersPage;
