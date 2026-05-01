import React, { useEffect, useRef } from "react";

const GOOGLE_IDENTITY_SCRIPT_ID = "google-identity-service";
const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let googleIdentityScriptPromise = null;

const loadGoogleIdentityScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google sign-in.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
};

const GoogleSignInButton = ({ onCredential, onError, loading = false }) => {
  const containerRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current) {
      return undefined;
    }

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential) {
              onError?.("Google sign-in did not return a valid credential.");
              return;
            }

            onCredential(response.credential);
          }
        });

        containerRef.current.innerHTML = "";
        const buttonWidth = Math.max(220, Math.min(containerRef.current.offsetWidth || 360, 360));
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: buttonWidth
        });
      })
      .catch((error) => {
        if (!cancelled) {
          onError?.(error.message || "Unable to load Google sign-in.");
        }
      });

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [clientId, onCredential, onError]);

  if (!clientId) {
    return null;
  }

  return (
    <div className="google-auth-slot">
      <div ref={containerRef} className="google-auth-button" />
      {loading && <div className="google-auth-overlay">Connecting to Google...</div>}
    </div>
  );
};

export default GoogleSignInButton;
