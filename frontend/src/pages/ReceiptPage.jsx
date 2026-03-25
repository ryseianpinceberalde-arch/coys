import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import api from "../utils/api";

const ReceiptPage = () => {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [saleRes, settingsRes] = await Promise.all([
        api.get(`/sales/${id}`),
        api.get("/settings")
      ]);
      setSale(saleRes.data);
      setSettings(settingsRes.data);
    };
    load();
  }, [id]);

  if (!sale || !settings) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="receipt printable">
        <h1>{settings.name}</h1>
        {settings.address && <div>{settings.address}</div>}
        {settings.phone && <div>{settings.phone}</div>}
        <hr />
        <div>Date: {new Date(sale.createdAt).toLocaleString()}</div>
        <div>Receipt #: {sale._id}</div>
        <hr />
        <table className="table no-border">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Sub</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((i, idx) => (
              <tr key={idx}>
                <td>{i.name}</td>
                <td>{i.quantity}</td>
                <td>${i.price.toFixed(2)}</td>
                <td>${i.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr />
        <div>Total: ${sale.total.toFixed(2)}</div>
        <div>Discount: ${sale.discount.toFixed(2)}</div>
        <div>Tax: ${sale.tax.toFixed(2)}</div>
        <div>Grand Total: ${sale.grandTotal.toFixed(2)}</div>
        <div>Paid: ${sale.paidAmount.toFixed(2)}</div>
        <div>Change: ${sale.change.toFixed(2)}</div>
        <hr />
        <div>{settings.receiptFooter}</div>
      </div>
      <button onClick={() => window.print()} className="primary">
        Print
      </button>
    </Layout>
  );
};

export default ReceiptPage;

