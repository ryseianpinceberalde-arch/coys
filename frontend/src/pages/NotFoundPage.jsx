import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div style={{
    minHeight: "100vh",
    background: "var(--bg)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "2rem",
    gap: "1rem"
  }}>
    <div style={{ fontSize: "5rem", animation: "float 3s ease-in-out infinite" }}>🍽️</div>
    <h1 style={{
      fontSize: "5rem",
      fontWeight: 900,
      lineHeight: 1,
      background: "linear-gradient(135deg,var(--accent),var(--accent2))",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text"
    }}>
      404
    </h1>
    <h2 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Page Not Found</h2>
    <p style={{ color: "var(--text2)", maxWidth: 400 }}>
      The page you're looking for doesn't exist or has been moved.
    </p>
    <Link to="/" className="btn primary" style={{ textDecoration: "none", marginTop: "0.5rem" }}>
      ← Back to Home
    </Link>
  </div>
);

export default NotFoundPage;
