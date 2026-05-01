import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import Modal from "../components/Modal.jsx";
import api from "../utils/api";

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const load = async () => {
    const res = await api.get("/categories");
    setCategories(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/categories", { name, description });
    setName("");
    setDescription("");
    setCreateModalOpen(false);
    await load();
  };

  const remove = async (id) => {
    if (!confirm("Move this category to archive?")) return;
    await api.delete(`/categories/${id}`);
    await load();
  };

  return (
    <Layout>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}
      >
        <div>
          <h1>Category Management</h1>
        </div>
        <button type="button" className="btn primary" onClick={() => setCreateModalOpen(true)}>
          + Add Category
        </button>
      </div>

      <div>
        <h2>Categories</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c._id}>
                <td>{c.name}</td>
                <td>{c.description}</td>
                <td>
                  <button onClick={() => remove(c._id)}>Archive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Add Category">
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn primary btn-sm">
              Create
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default CategoriesPage;

