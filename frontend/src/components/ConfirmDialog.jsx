import React from "react";
import Modal from "./Modal.jsx";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message = "Are you sure?",
  confirmLabel = "Confirm",
  variant = "danger"
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1.5rem" }}>{message}</div>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="btn btn-sm"
          onClick={handleConfirm}
          style={
            variant === "danger"
              ? { background: "var(--red)", color: "#fff", border: "1px solid var(--red)" }
              : { background: "var(--accent)", color: "var(--accent-ink)", border: "1px solid var(--accent)" }
          }
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
