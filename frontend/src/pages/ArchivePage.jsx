import React, { useCallback, useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../utils/api";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "user", label: "Users" },
  { value: "product", label: "Products" },
  { value: "category", label: "Categories" },
  { value: "brand", label: "Brands" },
  { value: "supplier", label: "Suppliers" }
];

const formatEntityLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ArchivePage = () => {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) {
        params.set("type", typeFilter);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await api.get(`/archive${params.toString() ? `?${params.toString()}` : ""}`);
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load archive");
    } finally {
      setLoading(false);
    }
  }, [search, toast, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const restoreRecord = async () => {
    if (!restoreTarget) {
      return;
    }

    setRestoring(true);
    try {
      const res = await api.post(`/archive/${restoreTarget.id}/restore`);
      toast.success(res.data?.message || "Record restored");
      setRestoreTarget(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore record");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Layout>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Archive</h1>
          <p className="text-muted">Review deleted records and restore them when needed</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Search archived records..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ minWidth: 240 }}
        />
        <button className="btn btn-sm primary" onClick={load}>Apply</button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setTypeFilter("");
            setSearch("");
          }}
        >
          Reset
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Record</th>
              <th>Type</th>
              <th>Deleted By</th>
              <th>Deleted At</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>
                  Loading archive...
                </td>
              </tr>
            )}
            {!loading && !records.length && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>
                  No archived records found
                </td>
              </tr>
            )}
            {records.map((record) => (
              <tr key={record.id}>
                <td style={{ fontWeight: 600, color: "var(--text)" }}>{record.recordName}</td>
                <td>
                  <span className="badge badge-blue">{formatEntityLabel(record.entityType)}</span>
                </td>
                <td style={{ color: "var(--text2)" }}>{record.deletedBy?.name || "System"}</td>
                <td style={{ color: "var(--text2)" }}>{new Date(record.deletedAt).toLocaleString()}</td>
                <td style={{ color: "var(--text2)" }}>{record.reason || "-"}</td>
                <td>
                  <button className="btn btn-sm primary" onClick={() => setRestoreTarget(record)}>
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={!!restoreTarget}
        onClose={() => !restoring && setRestoreTarget(null)}
        onConfirm={restoreRecord}
        title="Restore Record"
        message={`Restore "${restoreTarget?.recordName}" to the active records list?`}
        confirmLabel={restoring ? "Restoring..." : "Restore"}
        variant="primary"
      />
    </Layout>
  );
};

export default ArchivePage;
