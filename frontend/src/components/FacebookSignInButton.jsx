import React, { useEffect, useState } from "react";

const FACEBOOK_SDK_SCRIPT_ID = "facebook-jssdk";
const FACEBOOK_SDK_SCRIPT_SRC = "https://connect.facebook.net/en_US/sdk.js";
const FACEBOOK_GRAPH_VERSION = import.meta.env.VITE_FACEBOOK_GRAPH_VERSION || "v23.0";

let facebookSdkPromise = null;
let initializedFacebookAppId = null;

const initializeFacebookSdk = (appId) => {
  if (!window.FB?.init) {
    throw new Error("Facebook sign-in is not available in this browser right now.");
  }

  if (initializedFacebookAppId !== appId) {
    window.FB.init({
      appId,
      cookie: false,
      xfbml: false,
      version: FACEBOOK_GRAPH_VERSION,
    });
    initializedFacebookAppId = appId;
  }

  return window.FB;
};

const loadFacebookSdk = (appId) => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook sign-in is only available in the browser."));
  }

  if (!appId) {
    return Promise.reject(new Error("Facebook sign-in is not configured for web yet."));
  }

  if (window.FB?.login && initializedFacebookAppId === appId) {
    return Promise.resolve(window.FB);
  }

  if (facebookSdkPromise) {
    return facebookSdkPromise.then(() => initializeFacebookSdk(appId));
  }

  facebookSdkPromise = new Promise((resolve, reject) => {
    const finalizeLoad = () => {
      try {
        resolve(initializeFacebookSdk(appId));
      } catch (error) {
        reject(error);
      }
    };

    if (window.FB?.init) {
      finalizeLoad();
      return;
    }

    const existingScript = document.getElementById(FACEBOOK_SDK_SCRIPT_ID);
    const previousAsyncInit = window.fbAsyncInit;

    window.fbAsyncInit = () => {
      if (typeof previousAsyncInit === "function") {
        previousAsyncInit();
      }

      finalizeLoad();
    };

    if (existingScript) {
      existingScript.addEventListener("load", finalizeLoad, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Facebook sign-in.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = FACEBOOK_SDK_SCRIPT_ID;
    script.src = FACEBOOK_SDK_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Failed to load Facebook sign-in."));
    document.body.appendChild(script);
  });

  return facebookSdkPromise;
};

const FacebookSignInButton = ({ onAccessToken, onError, loading = false, mode = "signin" }) => {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(Boolean(appId));
  const [sdkError, setSdkError] = useState("");

  useEffect(() => {
    if (!appId) {
      setSdkLoading(false);
      setSdkReady(false);
      setSdkError("Facebook sign-in is not configured for web yet.");
      return undefined;
    }

    let cancelled = false;

    loadFacebookSdk(appId)
      .then(() => {
        if (!cancelled) {
          setSdkReady(true);
          setSdkError("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSdkReady(false);
          setSdkError(error.message || "Unable to load Facebook sign-in.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSdkLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appId]);

  if (!appId) {
    return null;
  }

  const handleClick = async () => {
    if (sdkLoading) {
      onError?.("Facebook sign-in is still loading. Please try again.");
      return;
    }

    if (sdkError) {
      onError?.(sdkError);
      return;
    }

    if (!sdkReady || !window.FB?.login) {
      onError?.("Facebook sign-in is not available right now.");
      return;
    }

    try {
      const response = await new Promise((resolve) => {
        window.FB.login(resolve, {
          scope: "public_profile",
          return_scopes: true,
        });
      });

      const accessToken = response?.authResponse?.accessToken;
      if (!accessToken) {
        return;
      }

      await onAccessToken?.(accessToken);
    } catch (error) {
      onError?.(error.message || "Facebook sign-in failed.");
    }
  };

  return (
    <button
      type="button"
      className="facebook-auth-btn btn-full"
      onClick={handleClick}
      disabled={loading || sdkLoading}
    >
      {loading || sdkLoading
        ? "Connecting to Facebook..."
        : mode === "register"
          ? "Continue with Facebook"
          : "Sign in with Facebook"}
    </button>
  );
};

export default FacebookSignInButton;
