import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fillDemo = (role) => {
    if (role === "admin") {
      setEmail("admin@coyscorner.com");
      setPassword("Admin@123");
    } else if (role === "staff") {
      setEmail("staff1@coyscorner.com");
      setPassword("Staff@123");
    } else {
      setEmail("user1@coyscorner.com");
      setPassword("User@123");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      // Network / proxy / server-down errors usually have no response object.
      const serverMessage = err.response?.data?.message;
      const isNetworkError = !err.response;
      setError(
        serverMessage ||
          (isNetworkError
            ? "Cannot reach the server. Make sure the backend is running on http://localhost:5000."
            : "Invalid email or password")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        {/* Brand side */}
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <div className="auth-brand-icon">🍽️</div>
            <span>Coy's Corner</span>
          </div>
          <h1>
            Manage your<br />
            <span>restaurant</span><br />
            with ease.
          </h1>
          <p>
            A powerful point-of-sale system built for modern restaurants.
            Track orders, inventory, and sales in real time.
          </p>
          <div className="auth-brand-features">
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              Real-time order management
            </div>
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              Inventory tracking & alerts
            </div>
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              Sales reports & analytics
            </div>
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              Multi-role access control
            </div>
          </div>
        </div>

        {/* Form side */}
        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2>Welcome back</h2>
              <p>Sign in to your account to continue</p>
            </div>

            {error && <div className="error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="auth-demo">
                <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Demo accounts (after running <code>npm run seed</code>):
                </div>
                <div className="auth-demo-buttons">
                  <button type="button" onClick={() => fillDemo("admin")}>
                    Use Admin
                  </button>
                  <button type="button" onClick={() => fillDemo("staff")}>
                    Use Staff
                  </button>
                  <button type="button" onClick={() => fillDemo("user")}>
                    Use User
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="primary btn-full"
                disabled={loading}
                style={{ marginTop: "0.5rem" }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Signing in…
                  </>
                ) : "Sign in"}
              </button>
            </form>

            <div className="auth-divider">or</div>

            <div className="auth-links">
              <span>
                No account?{" "}
                <Link to="/register">Create one free</Link>
              </span>
              <Link to="/menu" style={{ color: "var(--text3)", fontSize: "0.82rem" }}>
                Browse our menu without signing in →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
