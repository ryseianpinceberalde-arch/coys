import React from "react";

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);

  for (let i = left; i <= right; i++) {
    pages.push(i);
  }

  const btnBase = {
    minWidth: 36,
    height: 36,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg2)",
    color: "var(--text2)",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 0.5rem",
    transition: "all var(--transition)",
    fontFamily: "inherit"
  };

  const activeBtn = {
    ...btnBase,
    background: "var(--accent)",
    color: "var(--accent-ink)",
    border: "1px solid var(--accent)"
  };

  const disabledBtn = {
    ...btnBase,
    opacity: 0.35,
    cursor: "not-allowed"
  };

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", justifyContent: "center", padding: "1rem 0" }}>
      <button
        style={page <= 1 ? disabledBtn : btnBase}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ‹
      </button>

      {left > 1 && (
        <>
          <button style={btnBase} onClick={() => onPageChange(1)}>1</button>
          {left > 2 && <span style={{ color: "var(--text3)", padding: "0 0.25rem" }}>…</span>}
        </>
      )}

      {pages.map(p => (
        <button
          key={p}
          style={p === page ? activeBtn : btnBase}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      {right < totalPages && (
        <>
          {right < totalPages - 1 && <span style={{ color: "var(--text3)", padding: "0 0.25rem" }}>…</span>}
          <button style={btnBase} onClick={() => onPageChange(totalPages)}>{totalPages}</button>
        </>
      )}

      <button
        style={page >= totalPages ? disabledBtn : btnBase}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        ›
      </button>
    </div>
  );
};

export default Pagination;
