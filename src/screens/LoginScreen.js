import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Btn from "../components/Btn";
import FacebookAuthButton from "../components/FacebookAuthButton";
import GoogleAuthButton from "../components/GoogleAuthButton";
import Input from "../components/Input";
import StoreLogo from "../components/StoreLogo";
import C from "../constants/colors";
import { getStoreSettings, loginUser } from "../services/api";
import { saveAuth } from "../services/storage";
import { isValidEmail } from "../utils/helpers";
import { createShadow } from "../utils/shadow";

export default function LoginScreen({ navigation, onLogin, onContinueGuest }) {
  const [settings, setSettings] = useState({ name: "Coy's Corner", logoUrl: "" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    getStoreSettings()
      .then((value) => {
        if (active) {
          setSettings(value);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    const nextErrors = {};
    if (!email.trim()) {
      nextErrors.email = "Required";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Invalid email";
    }
    if (!password) {
      nextErrors.password = "Required";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(email, password);
      if (res.ok) {
        await saveAuth(res.token, res.user);
        onLogin(res.user);
      }
    } catch (error) {
      Alert.alert("Sign In Failed", error?.message || "Unable to sign in right now");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (message) => {
    Alert.alert("Google Sign-In Failed", message || "Unable to sign in with Google right now.");
  };

  const handleFacebookError = (message) => {
    Alert.alert("Facebook Sign-In Failed", message || "Unable to sign in with Facebook right now.");
  };

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="always">
        <View style={s.hero}>
          <StoreLogo logoUrl={settings.logoUrl} size={82} borderRadius={24} style={s.logo} />

          <View style={s.badge}>
            <Text style={s.badgeTxt}>Mobile Ordering</Text>
          </View>

          <Text style={s.title}>{settings.name || "Coy's Corner"}</Text>
          <Text style={s.sub}>
            Browse products, place orders, and track status updates in real time.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Sign In</Text>
          <Text style={s.cardSub}>{`Use your existing ${settings.name || "Coy's Corner"} customer account. Staff and admin should use the web dashboard.`}</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            error={errors.email}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
            error={errors.password}
          />

          <Btn title="Sign In" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
          <GoogleAuthButton onLogin={onLogin} onError={handleGoogleError} style={{ marginTop: 12 }} />
          <FacebookAuthButton onLogin={onLogin} onError={handleFacebookError} style={{ marginTop: 12 }} />
          <Btn title="Continue as Guest" onPress={onContinueGuest} variant="outline" style={{ marginTop: 10 }} />

          <View style={s.footer}>
            <Text style={s.footerTxt}>No account yet? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={s.link}>Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: "center" },
  hero: { marginBottom: 28 },
  logo: {
    marginBottom: 18,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF1E8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeTxt: {
    color: C.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.8,
  },
  sub: {
    fontSize: 15,
    color: C.textSec,
    lineHeight: 22,
    marginTop: 10,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    ...createShadow({ color: "#0f172a", opacity: 0.05, radius: 18, offsetY: 10, elevation: 2 }),
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
  },
  cardSub: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 6,
    marginBottom: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerTxt: {
    fontSize: 14,
    color: C.textSec,
  },
  link: {
    fontSize: 14,
    fontWeight: "800",
    color: C.primary,
  },
});
