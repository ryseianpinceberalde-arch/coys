import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import Btn from "./Btn";
import C from "../constants/colors";
import { loginWithFacebookUser } from "../services/api";
import { saveAuth } from "../services/storage";

WebBrowser.maybeCompleteAuthSession();

const facebookAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || "";
const appScheme = "coys";
const nativeOAuthRedirectPath = "oauthredirect";
const nativeFacebookRedirectUri = AuthSession.makeRedirectUri({
  scheme: appScheme,
  path: nativeOAuthRedirectPath,
});
const facebookDiscovery = {
  authorizationEndpoint: "https://www.facebook.com/v23.0/dialog/oauth",
};
const facebookScope = "public_profile";

const isSecureWebContext = () =>
  Platform.OS !== "web"
  || typeof window === "undefined"
  || Boolean(window.isSecureContext);

const createOAuthState = () => {
  if (typeof Crypto.randomUUID === "function") {
    return Crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createFacebookAuthUrl = ({ redirectUri, state }) => {
  const params = new URLSearchParams({
    client_id: facebookAppId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: facebookScope,
    state,
    display: "popup",
  });

  return `${facebookDiscovery.authorizationEndpoint}?${params.toString()}`;
};

const getParamsFromRedirectUrl = (url) => {
  const value = String(url || "");
  const hashIndex = value.indexOf("#");
  const queryIndex = value.indexOf("?");
  const fragment = hashIndex >= 0 ? value.slice(hashIndex + 1) : "";
  const query = queryIndex >= 0
    ? value.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
    : "";

  return new URLSearchParams(fragment || query);
};

const redactAccessToken = (url) => {
  const value = String(url || "");
  if (!value.includes("access_token=")) {
    return value;
  }

  const hashIndex = value.indexOf("#");
  if (hashIndex < 0) {
    return value.replace(/access_token=[^&]+/, "access_token=[redacted]");
  }

  const base = value.slice(0, hashIndex + 1);
  const params = new URLSearchParams(value.slice(hashIndex + 1));
  params.set("access_token", "[redacted]");
  return `${base}${params.toString()}`;
};

function ConfiguredFacebookAuthButton({ onLogin, onError, style, mode = "signin" }) {
  const mountedRef = useRef(true);
  const pendingAuthRef = useRef(null);
  const handledRedirectRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [debugStatus, setDebugStatus] = useState("Idle");
  const [lastUrl, setLastUrl] = useState("");
  const actionName = mode === "register" ? "sign-up" : "sign-in";
  const redirectUri = Platform.OS === "web"
    ? AuthSession.makeRedirectUri({ preferLocalhost: true })
    : nativeFacebookRedirectUri;

  useEffect(() => {
    WebBrowser.warmUpAsync().catch(() => {});

    return () => {
      mountedRef.current = false;
      WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  const completeFacebookSignIn = useCallback(async (accessToken) => {
    try {
      const result = await loginWithFacebookUser(accessToken);
      if (!mountedRef.current) {
        return;
      }

      if (result.ok) {
        setDebugStatus("Backend login succeeded.");
        await saveAuth(result.token, result.user);
        onLogin(result.user);
      }
    } catch (error) {
      if (mountedRef.current) {
        setDebugStatus(`Backend login failed: ${error?.message || "Unknown error"}`);
        onError?.(error?.message || "Unable to sign in with Facebook right now.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [onError, onLogin]);

  const handleFacebookRedirectUrl = useCallback(async (url) => {
    const safeUrl = redactAccessToken(url);
    setLastUrl(safeUrl);

    if (!String(url || "").startsWith(redirectUri)) {
      setDebugStatus(`Received non-Facebook deep link: ${safeUrl}`);
      return false;
    }

    if (handledRedirectRef.current === url) {
      return true;
    }

    const pendingAuth = pendingAuthRef.current;
    if (!pendingAuth) {
      setDebugStatus(`Received Facebook redirect with no pending ${actionName}: ${safeUrl}`);
      return false;
    }

    handledRedirectRef.current = url;
    pendingAuthRef.current = null;

    const params = getParamsFromRedirectUrl(url);
    const returnedState = params.get("state") || "";
    const accessToken = params.get("access_token") || "";
    const errorMessage =
      params.get("error_message")
      || params.get("error_description")
      || params.get("error");

    if (errorMessage) {
      setLoading(false);
      setDebugStatus(`Facebook returned error: ${errorMessage}`);
      onError?.(errorMessage);
      return true;
    }

    if (returnedState !== pendingAuth.state) {
      setLoading(false);
      setDebugStatus("Facebook returned an invalid state.");
      onError?.(`Facebook ${actionName} returned an invalid response. Please try again.`);
      return true;
    }

    if (!accessToken) {
      setLoading(false);
      setDebugStatus("Facebook returned success without an access token.");
      onError?.(`Facebook ${actionName} did not return an access token.`);
      return true;
    }

    setDebugStatus("Facebook returned an access token.");
    await completeFacebookSignIn(accessToken);
    return true;
  }, [actionName, completeFacebookSignIn, onError, redirectUri]);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleFacebookRedirectUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleFacebookRedirectUrl]);

  const handlePress = async () => {
    setLoading(true);

    try {
      const state = createOAuthState();
      const authUrl = createFacebookAuthUrl({ redirectUri, state });

      pendingAuthRef.current = { state };
      handledRedirectRef.current = "";
      setLastUrl(authUrl);
      setDebugStatus(`Opening Facebook auth with scope=${facebookScope}`);

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type !== "success") {
        if (pendingAuthRef.current?.state === state) {
          pendingAuthRef.current = null;
          setLoading(false);
          setDebugStatus(`Facebook auth result: ${result.type || "unknown"}`);
        }
        return;
      }

      const handled = await handleFacebookRedirectUrl(result.url);
      if (!handled) {
        pendingAuthRef.current = null;
        setLoading(false);
        setDebugStatus("Facebook did not return to the expected redirect URI.");
        onError?.(`Facebook ${actionName} did not return to the app. Please try again.`);
      }
    } catch (error) {
      pendingAuthRef.current = null;
      setLoading(false);
      setDebugStatus(`Unable to open Facebook sign-in: ${error?.message || "Unknown error"}`);
      onError?.(error?.message || `Unable to open Facebook ${actionName}.`);
    }
  };

  return (
    <View style={style}>
      <Btn
        title={
          loading
            ? "Connecting to Facebook..."
            : mode === "register"
              ? "Continue with Facebook"
              : "Sign in with Facebook"
        }
        onPress={handlePress}
        variant="outline"
        loading={loading}
        disabled={loading}
      />
      <Text style={s.note}>
        Facebook sign-in creates or opens your customer account.
      </Text>
      {__DEV__ ? (
        <Text style={s.devHint}>
          {`Facebook redirect URI: ${redirectUri}`}
        </Text>
      ) : null}
      {__DEV__ ? (
        <Text style={s.devHint}>
          {`Facebook debug: ${debugStatus}`}
        </Text>
      ) : null}
      {__DEV__ && lastUrl ? (
        <Text style={s.devHint}>
          {`Last URL: ${lastUrl}`}
        </Text>
      ) : null}
    </View>
  );
}

function DisabledFacebookAuthButton({ message, style, mode = "signin" }) {
  return (
    <View style={style}>
      <Btn
        title={mode === "register" ? "Continue with Facebook" : "Sign in with Facebook"}
        onPress={() => {}}
        variant="outline"
        disabled
      />
      <Text style={s.note}>{message}</Text>
    </View>
  );
}

export default function FacebookAuthButton(props) {
  if (!facebookAppId) {
    return (
      <DisabledFacebookAuthButton
        {...props}
        message="Facebook sign-in is not configured yet. Add EXPO_PUBLIC_FACEBOOK_APP_ID in .env.local."
      />
    );
  }

  if (Platform.OS === "web" && !isSecureWebContext()) {
    return (
      <DisabledFacebookAuthButton
        {...props}
        message="Facebook sign-in on web requires a secure origin such as http://localhost:8081 or HTTPS."
      />
    );
  }

  return <ConfiguredFacebookAuthButton {...props} />;
}

const s = StyleSheet.create({
  note: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: C.textMuted,
    textAlign: "center",
  },
  devHint: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 16,
    color: C.textSec,
    textAlign: "center",
  },
});
