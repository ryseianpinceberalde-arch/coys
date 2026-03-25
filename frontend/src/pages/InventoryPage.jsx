import React, { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import api from "../utils/api";

const InventoryPage = () => {
  const [products, setProducts] = useState([]);

  const load = async () => {
    const res = await api.get("/products");
    setProducts(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <h1>Inventory</h1>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td>{p.name}</td>
              <td>{p.category?.name}</td>
              <td>{p.stockQuantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
};

export default InventoryPage;

