import React, { useEffect, useState } from "react";
import {
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  View,
} from "react-native";
import * as AuthSession from "expo-auth-session";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Btn from "./Btn";
import C from "../constants/colors";
import { loginWithGoogleUser } from "../services/api";
import { saveAuth } from "../services/storage";

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";
const webRedirectUri = process.env.EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_URI || "";
const iosRedirectUri = process.env.EXPO_PUBLIC_GOOGLE_IOS_REDIRECT_URI || "";
const androidApplicationId = "com.ryse.coys";
const androidDebugSha1 = "5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25";
const androidDeveloperErrorMessage =
  `Google Android sign-in is misconfigured. Update the Google Cloud Android OAuth client to use package ${androidApplicationId} ` +
  `with SHA-1 ${androidDebugSha1}, and make sure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is a Web client ID.`;
const appScheme = "coys";
const nativeOAuthRedirectPath = "oauthredirect";
const getBrowserOrigin = () =>
  Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.origin
    : "";
const getSecureLocalhostOrigin = () => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return "http://localhost:8081";
  }

  return `http://localhost:${window.location.port || "8081"}`;
};
const isExpoGo = () =>
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isSecureWebContext = () =>
  Platform.OS !== "web"
  || typeof window === "undefined"
  || Boolean(window.isSecureContext);
let nativeGoogleSigninModule;
const hasNativeGoogleSigninBinding = () => {
  if (Platform.OS === "web" || isExpoGo()) {
    return false;
  }

  return Boolean(
    NativeModules?.RNGoogleSignin
    || TurboModuleRegistry?.get?.("RNGoogleSignin"),
  );
};
const getNativeGoogleSigninModule = () => {
  if (!hasNativeGoogleSigninBinding()) {
    return null;
  }

  if (nativeGoogleSigninModule !== undefined) {
    return nativeGoogleSigninModule;
  }

  try {
    nativeGoogleSigninModule = require("@react-native-google-signin/google-signin");
  } catch {
    nativeGoogleSigninModule = null;
  }

  return nativeGoogleSigninModule;
};

function AndroidGoogleAuthButton({
  nativeGoogleSignin,
  onLogin,
  onError,
  style,
  mode = "signin",
}) {
  const [loading, setLoading] = useState(false);
  const GoogleSignin = nativeGoogleSignin?.GoogleSignin;
  const isErrorWithCode = nativeGoogleSignin?.isErrorWithCode;
  const statusCodes = nativeGoogleSignin?.statusCodes;
  const hasNativeGoogleSignin = Boolean(GoogleSignin);
  const hasPlatformClientId = Boolean(webClientId) && hasNativeGoogleSignin;
  const missingClientIdMessage = isExpoGo()
    ? "Google sign-in on Android is not available in Expo Go. Use a development build or sign in with email/password."
    : !webClientId
      ? "Google sign-in is not configured for Android yet. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env.local."
      : "Google sign-in is not available in this Android build yet.";

  useEffect(() => {
    if (!hasPlatformClientId) {
      return;
    }

    // Native Google Sign-In uses the Web client ID to mint the ID token that
    // our backend verifies. The Android OAuth client still needs to exist in
    // Google Cloud for the package name + SHA-1 registration.
    GoogleSignin.configure({
      webClientId,
      offlineAccess: false,
    });
  }, [GoogleSignin, hasPlatformClientId]);

  const handlePress = async () => {
    if (!hasPlatformClientId) {
      onError?.(missingClientIdMessage);
      return;
    }

    setLoading(true);

    try {
      const playServicesAvailable = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      if (!playServicesAvailable) {
        onError?.("Google Play Services is not available on this device.");
        return;
      }

      const response = await GoogleSignin.signIn();
      if (response?.type === "cancelled") {
        return;
      }

      const credential = response?.data?.idToken || (await GoogleSignin.getTokens()).idToken;
      if (!credential) {
        onError?.("Google sign-in did not return an ID token.");
        return;
      }

      const result = await loginWithGoogleUser(credential);
      if (result.ok) {
        await saveAuth(result.token, result.user);
        onLogin(result.user);
      }
    } catch (error) {
      if (isErrorWithCode?.(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }

        if (error.code === statusCodes.IN_PROGRESS) {
          onError?.("Google sign-in is already in progress.");
          return;
        }

        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          onError?.("Google Play Services is not available on this device.");
          return;
        }

        if (error.code === "10" || error.code === 10) {
          onError?.(androidDeveloperErrorMessage);
          return;
        }
      }

      if (String(error?.message || "").includes("DEVELOPER_ERROR")) {
        onError?.(androidDeveloperErrorMessage);
        return;
      }

      onError?.(error?.message || "Unable to sign in with Google right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={style}>
      <Btn
        title={
          loading
            ? "Connecting to Google..."
            : mode === "register"
              ? "Continue with Google"
              : "Sign in with Google"
        }
        onPress={handlePress}
        variant="outline"
        loading={loading}
        disabled={loading || !hasPlatformClientId}
      />
      <Text style={s.note}>
        {hasPlatformClientId
          ? "Google sign-in creates or opens your customer account."
          : missingClientIdMessage}
      </Text>
    </View>
  );
}

function BrowserGoogleAuthButton({ onLogin, onError, style, mode = "signin" }) {
  const [loading, setLoading] = useState(false);
  const runtimeWebRedirectUri = Platform.OS === "web" && isSecureWebContext()
    ? AuthSession.makeRedirectUri({ preferLocalhost: true })
    : "";
  const runtimeAndroidRedirectUri = Platform.OS === "android"
    ? AuthSession.makeRedirectUri({
        scheme: appScheme,
        path: nativeOAuthRedirectPath,
      })
    : "";
  const runtimeIosRedirectUri = Platform.OS === "ios"
    ? AuthSession.makeRedirectUri({
        scheme: appScheme,
        path: nativeOAuthRedirectPath,
      })
    : "";
  const hasPlatformClientId = Platform.OS === "android"
    ? Boolean(androidClientId)
    : Platform.OS === "ios"
      ? Boolean(iosClientId)
      : Boolean(webClientId);
  const missingClientIdMessage = Platform.OS === "android"
    ? "Google sign-in is not configured for Android yet. Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in .env.local."
    : Platform.OS === "ios"
      ? "Google sign-in is not configured for iPhone yet. Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in .env.local."
      : "Google sign-in is not configured for web yet.";
  const explicitRedirectUri = Platform.OS === "web"
    ? runtimeWebRedirectUri || webRedirectUri || undefined
    : Platform.OS === "android"
      ? runtimeAndroidRedirectUri || undefined
    : Platform.OS === "ios"
      ? iosRedirectUri || runtimeIosRedirectUri || undefined
      : undefined;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      ...(webClientId ? { webClientId } : {}),
      ...(androidClientId ? { androidClientId } : {}),
      ...(iosClientId ? { iosClientId } : {}),
      ...(explicitRedirectUri ? { redirectUri: explicitRedirectUri } : {}),
      scopes: ["openid", "profile", "email"],
      selectAccount: true,
    },
    explicitRedirectUri
      ? {}
      : Platform.OS === "web"
        ? {}
        : {
            path: nativeOAuthRedirectPath,
            scheme: appScheme,
          },
  );
  const redirectUriHint = request?.redirectUri
    || explicitRedirectUri
    || runtimeWebRedirectUri;

  useEffect(() => {
    if (__DEV__ && hasPlatformClientId && redirectUriHint) {
      console.info(`[GoogleAuth] Redirect URI: ${redirectUriHint}`);
    }
  }, [hasPlatformClientId, redirectUriHint]);

  useEffect(() => {
    WebBrowser.warmUpAsync().catch(() => {});

    return () => {
      WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let active = true;

    const completeGoogleSignIn = async () => {
      if (response?.type !== "success") {
        if (response?.type === "error") {
          onError?.(response.error?.message || "Google sign-in failed.");
        }
        setLoading(false);
        return;
      }

      const credential = response.params?.id_token;
      if (!credential) {
        onError?.("Google sign-in did not return an ID token.");
        setLoading(false);
        return;
      }

      try {
        const result = await loginWithGoogleUser(credential);
        if (!active) {
          return;
        }

        if (result.ok) {
          await saveAuth(result.token, result.user);
          onLogin(result.user);
        }
      } catch (error) {
        if (active) {
          onError?.(error?.message || "Unable to sign in with Google right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (response) {
      completeGoogleSignIn();
    }

    return () => {
      active = false;
    };
  }, [onError, onLogin, response]);

  const handlePress = async () => {
    if (!hasPlatformClientId) {
      onError?.(missingClientIdMessage);
      return;
    }

    if (!request) {
      onError?.("Google sign-in is still loading. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const result = await promptAsync();
      if (result.type !== "success") {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      onError?.(error?.message || "Unable to open Google sign-in.");
    }
  };

  return (
    <View style={style}>
      <Btn
        title={
          loading
            ? "Connecting to Google..."
            : mode === "register"
              ? "Continue with Google"
              : "Sign in with Google"
        }
        onPress={handlePress}
        variant="outline"
        loading={loading}
        disabled={loading || !request || !hasPlatformClientId}
      />
      <Text style={s.note}>
        {hasPlatformClientId
          ? "Google sign-in creates or opens your customer account."
          : missingClientIdMessage}
      </Text>
      {__DEV__ && hasPlatformClientId && redirectUriHint ? (
        <Text style={s.devHint}>
          {`Google OAuth redirect URI: ${redirectUriHint}`}
        </Text>
      ) : null}
    </View>
  );
}

function InsecureWebGoogleAuthButton({ style, mode = "signin" }) {
  const currentOrigin = getBrowserOrigin();
  const localhostOrigin = getSecureLocalhostOrigin();
  const canSwitchToLocalhost = currentOrigin && currentOrigin !== localhostOrigin;
  const switchToLocalhost = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.location.replace(localhostOrigin);
  };

  return (
    <View style={style}>
      <Btn
        title={mode === "register" ? "Continue with Google" : "Sign in with Google"}
        onPress={() => {}}
        variant="outline"
        disabled
      />
      <Text style={s.note}>
        Google sign-in on web requires a secure origin. Open this app from `http://localhost:8081`
        {" "}or HTTPS instead of the current origin.
      </Text>
      {__DEV__ && currentOrigin ? (
        <Text style={s.devHint}>
          {`Current origin: ${currentOrigin}`}
        </Text>
      ) : null}
      {canSwitchToLocalhost ? (
        <Btn
          title="Open Secure Localhost"
          onPress={switchToLocalhost}
          variant="ghost"
          style={{ marginTop: 10 }}
        />
      ) : null}
    </View>
  );
}

export default function GoogleAuthButton(props) {
  const nativeGoogleSignin = getNativeGoogleSigninModule();

  if (Platform.OS === "android" && nativeGoogleSignin?.GoogleSignin) {
    return <AndroidGoogleAuthButton nativeGoogleSignin={nativeGoogleSignin} {...props} />;
  }

  if (Platform.OS === "web" && !isSecureWebContext()) {
    return <InsecureWebGoogleAuthButton {...props} />;
  }

  return <BrowserGoogleAuthButton {...props} />;
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
