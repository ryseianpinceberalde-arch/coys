import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
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
            Join us &<br />
            <span>start ordering</span><br />
            today.
          </h1>
          <p>
            Create a free account to browse our menu, place orders,
            and track your purchase history — all in one place.
          </p>
          <div className="auth-brand-features">
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              Browse the full menu
            </div>
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              Track your orders
            </div>
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              View purchase history
            </div>
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              Free to sign up
            </div>
          </div>
        </div>

        {/* Form side */}
        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-card-header">
              <h2>Create an account</h2>
              <p>Fill in your details to get started</p>
            </div>

            {error && <div className="error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
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
                    Creating account…
                  </>
                ) : "Create account"}
              </button>
            </form>

            <div className="auth-divider">or</div>

            <div className="auth-links">
              <span>
                Already have an account?{" "}
                <Link to="/login">Sign in</Link>
              </span>
              <Link to="/menu" style={{ color: "var(--text3)", fontSize: "0.82rem" }}>
                Browse menu without signing in →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
