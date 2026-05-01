import React, { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FacebookSignInButton from "../components/FacebookSignInButton.jsx";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import { useAuth } from "../state/AuthContext.jsx";

const RegisterPage = () => {
  const { requestRegistrationOtp, register, loginWithGoogle, loginWithFacebook } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const storeName = settings?.name || "Coy's Corner";
  const logoUrl = settings?.logoUrl || "";
  const hasLogo = Boolean(logoUrl);
  const hasGoogleSignIn = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const hasFacebookSignIn = Boolean(import.meta.env.VITE_FACEBOOK_APP_ID);
  const hasSocialSignIn = hasGoogleSignIn || hasFacebookSignIn;
  const socialAuthNote = hasGoogleSignIn && hasFacebookSignIn
    ? "Continue with Google or Facebook to create a customer account instantly."
    : hasGoogleSignIn
      ? "Continue with Google to create a customer account instantly."
      : "Continue with Facebook to create a customer account instantly.";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!otpSent) {
        const result = await requestRegistrationOtp(name, email, password);
        setOtpSent(true);
        setOtp("");
        setOtpMessage(`We sent a 6-digit OTP to ${email.trim().toLowerCase()}. It expires in ${result.expiresInMinutes || 10} minutes.`);
        return;
      }

      await register(name, email, password, otp);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await requestRegistrationOtp(name, email, password);
      setOtp("");
      setOtpMessage(`We sent a new OTP to ${email.trim().toLowerCase()}. It expires in ${result.expiresInMinutes || 10} minutes.`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeDetails = () => {
    setOtpSent(false);
    setOtp("");
    setOtpMessage("");
    setError("");
  };

  const handleGoogleSignIn = useCallback(async (credential) => {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle(credential);
      navigate("/");
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
      await loginWithFacebook(accessToken);
      navigate("/");
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
            Join us and
            <br />
            <span>start ordering</span>
            <br />
            today.
          </h1>
          <p>
            Create a free account to browse our menu, place orders,
            and track your purchase history, all in one place.
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

              {otpSent && (
                <>
                  <div className="auth-info">{otpMessage}</div>
                  <div className="form-group">
                    <label>Email OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="primary btn-full"
                disabled={loading}
                style={{ marginTop: "0.5rem" }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Creating account...
                  </>
                ) : (
                  otpSent ? "Verify OTP & create account" : "Send OTP"
                )}
              </button>
            </form>

            {otpSent && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginTop: "0.85rem" }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleResendOtp} disabled={loading}>
                  Resend OTP
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleChangeDetails} disabled={loading}>
                  Change details
                </button>
              </div>
            )}

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
                      mode="register"
                    />
                  )}
                </div>
                <div className="social-auth-note">{socialAuthNote}</div>
              </>
            )}

            <div className="auth-links">
              <span>
                Already have an account? <Link to="/login">Sign in</Link>
              </span>
              <Link to="/menu" style={{ color: "var(--text3)", fontSize: "0.82rem" }}>
                Browse menu without signing in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
