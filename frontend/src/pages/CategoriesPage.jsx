import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../utils/api";

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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
    await load();
  };

  const remove = async (id) => {
    if (!confirm("Delete category?")) return;
    await api.delete(`/categories/${id}`);
    await load();
  };

  return (
    <Layout>
      <h1>Category Management</h1>
      <div className="grid-2">
        <form onSubmit={submit} className="card">
          <h2>Add Category</h2>
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
          <button type="submit" className="primary">
            Create
          </button>
        </form>
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
                    <button onClick={() => remove(c._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default CategoriesPage;

