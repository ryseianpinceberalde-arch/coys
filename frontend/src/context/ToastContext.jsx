import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((msg) => addToast(msg, "success"), [addToast]);
  const error = useCallback((msg) => addToast(msg, "error"), [addToast]);
  const warning = useCallback((msg) => addToast(msg, "warning"), [addToast]);
  const info = useCallback((msg) => addToast(msg, "info"), [addToast]);

  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  const colors = {
    success: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.4)", color: "#22c55e" },
    error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.4)",  color: "#ef4444" },
    warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)", color: "#f59e0b" },
    info:    { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)", color: "#3b82f6" }
  };

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          pointerEvents: "none"
        }}
      >
        {toasts.map(toast => {
          const c = colors[toast.type] || colors.info;
          return (
            <div
              key={toast.id}
              onClick={() => dismiss(toast.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.6rem",
                background: "#161f35",
                border: `1px solid ${c.border}`,
                borderLeft: `4px solid ${c.color}`,
                borderRadius: "0.75rem",
                padding: "0.75rem 1rem",
                minWidth: "280px",
                maxWidth: "380px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                animation: "slideInRight 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
                cursor: "pointer",
                pointerEvents: "auto",
                color: "#f1f5f9"
              }}
            >
              <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "0.05rem" }}>{icons[toast.type]}</span>
              <span style={{ fontSize: "0.875rem", lineHeight: 1.5, flex: 1 }}>{toast.message}</span>
              <span
                style={{
                  fontSize: "1rem",
                  color: "#64748b",
                  flexShrink: 0,
                  lineHeight: 1,
                  marginTop: "0.05rem"
                }}
              >
                ×
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
