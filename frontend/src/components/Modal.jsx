import React, { useEffect, useCallback } from "react";

const sizes = { sm: "400px", md: "560px", lg: "760px" };

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  const handleKey = useCallback((e) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKey]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
        animation: "fadeIn 0.2s ease both"
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: sizes[size] || sizes.md,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
          animation: "scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0
          }}
        >
          <h3 style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text)", margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--bg2)",
              color: "var(--text2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              lineHeight: 1,
              cursor: "pointer",
              flexShrink: 0,
              transition: "all var(--transition)"
            }}
            onMouseOver={e => { e.currentTarget.style.background = "var(--red)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--red)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "var(--bg2)"; e.currentTarget.style.color = "var(--text2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
