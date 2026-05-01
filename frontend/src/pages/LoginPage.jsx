import React, { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FacebookSignInButton from "../components/FacebookSignInButton.jsx";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import { useAuth } from "../state/AuthContext.jsx";

const getHomePath = (user) => {
  if (user?.role === "admin") {
    return "/admin";
  }

  if (user?.role === "staff") {
    return "/staff";
  }

  return "/user";
};

const LoginPage = () => {
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const storeName = settings?.name || "Coy's Corner";
  const logoUrl = settings?.logoUrl || "";
  const hasLogo = Boolean(logoUrl);
  const hasGoogleSignIn = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const hasFacebookSignIn = Boolean(import.meta.env.VITE_FACEBOOK_APP_ID);
  const hasSocialSignIn = hasGoogleSignIn || hasFacebookSignIn;
  const socialAuthNote = hasGoogleSignIn && hasFacebookSignIn
    ? "Google and Facebook sign-in create or open customer accounts. Staff and admin should continue using email and password."
    : hasGoogleSignIn
      ? "Google sign-in creates or opens customer accounts. Staff and admin should continue using email and password."
      : "Facebook sign-in creates or opens customer accounts. Staff and admin should continue using email and password.";

  const fillDemo = (role) => {
    if (role === "admin") {
      setEmail("admin@coyscorner.com");
      setPassword("Admin@123");
      return;
    }

    if (role === "staff") {
      setEmail("staff1@coyscorner.com");
      setPassword("Staff@123");
      return;
    }

    setEmail("user1@coyscorner.com");
    setPassword("User@123");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const signedInUser = await login(email, password);
      navigate(getHomePath(signedInUser), { replace: true });
    } catch (err) {
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

  const handleGoogleSignIn = useCallback(async (credential) => {
    setError("");
    setLoading(true);

    try {
      const signedInUser = await loginWithGoogle(credential);
      navigate(getHomePath(signedInUser), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  const handleGoogleError = useCallback((message) => {
    setError(message);
  }, []);

  const handleFacebookSignIn = useCallback(async (accessToken) => {
    setError("");
    setLoading(true);

    try {
      const signedInUser = await loginWithFacebook(accessToken);
      navigate(getHomePath(signedInUser), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Facebook sign-in failed");
    } finally {
      setLoading(false);
    }
  }, [loginWithFacebook, navigate]);

  const handleFacebookError = useCallback((message) => {
    setError(message);
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <div className={`auth-brand-icon${hasLogo ? " auth-brand-icon--image" : ""}`} style={{ overflow: "hidden" }}>
              {hasLogo ? (
                <img
                  src={logoUrl}
                  alt={`${storeName} logo`}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                "🍽️"
              )}
            </div>
            <span>{storeName}</span>
          </div>

          <h1>
            Manage your
            <br />
            <span>restaurant</span>
            <br />
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
              Inventory tracking and alerts
            </div>
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              Sales reports and analytics
            </div>
            <div className="auth-brand-feature">
              <span className="feat-dot" />
              Multi-role access control
            </div>
          </div>
        </div>

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
                  placeholder="........"
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
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {hasSocialSignIn && <div className="auth-divider">or</div>}

            {hasSocialSignIn && (
              <>
                <div className="social-auth-buttons">
                  {hasGoogleSignIn && (
                    <GoogleSignInButton
                      onCredential={handleGoogleSignIn}
                      onError={handleGoogleError}
                      loading={loading}
                    />
                  )}
                  {hasFacebookSignIn && (
                    <FacebookSignInButton
                      onAccessToken={handleFacebookSignIn}
                      onError={handleFacebookError}
                      loading={loading}
                    />
                  )}
                </div>
                <div className="social-auth-note">{socialAuthNote}</div>
              </>
            )}

            <div className="auth-links">
              <span>
                No account? <Link to="/register">Create one free</Link>
              </span>
              <Link to="/menu" style={{ color: "var(--text3)", fontSize: "0.82rem" }}>
                Browse our menu without signing in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
