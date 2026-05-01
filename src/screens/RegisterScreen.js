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
import { getStoreSettings, registerUser, requestRegistrationOtp } from "../services/api";
import { saveAuth } from "../services/storage";
import { isValidEmail, isValidPhone } from "../utils/helpers";
import { createShadow } from "../utils/shadow";

export default function RegisterScreen({ navigation, onLogin }) {
  const [settings, setSettings] = useState({ name: "Coy's Corner", logoUrl: "" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
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

  const validateForm = ({ requireOtp = false } = {}) => {
    const nextErrors = {};
    if (!name.trim()) {
      nextErrors.name = "Required";
    }
    if (!email.trim()) {
      nextErrors.email = "Required";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Invalid email";
    }
    if (!phone.trim()) {
      nextErrors.phone = "Required";
    } else if (!isValidPhone(phone)) {
      nextErrors.phone = "Use 09XXXXXXXXX format";
    }
    if (!password || password.length < 6) {
      nextErrors.password = "Minimum 6 characters";
    }
    if (requireOtp && !/^\d{6}$/.test(otp.trim())) {
      nextErrors.otp = "Enter the 6-digit OTP";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validateForm({ requireOtp: otpSent })) {
      return;
    }

    setLoading(true);
    try {
      if (!otpSent) {
        const res = await requestRegistrationOtp(name, email, phone, password);
        setOtpSent(true);
        setOtp("");
        setOtpMessage(`We sent a 6-digit OTP to ${email.trim().toLowerCase()}. It expires in ${res.expiresInMinutes} minutes.`);
        return;
      }

      const res = await registerUser(name, email, phone, password, otp);
      if (res.ok) {
        await saveAuth(res.token, res.user);
        onLogin(res.user);
      }
    } catch (error) {
      Alert.alert("Registration Failed", error?.message || "Unable to create your account");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await requestRegistrationOtp(name, email, phone, password);
      setOtp("");
      setOtpMessage(`We sent a new OTP to ${email.trim().toLowerCase()}. It expires in ${res.expiresInMinutes} minutes.`);
    } catch (error) {
      Alert.alert("OTP Failed", error?.message || "Unable to send OTP right now");
    } finally {
      setLoading(false);
    }
  };

  const changeDetails = () => {
    setOtpSent(false);
    setOtp("");
    setOtpMessage("");
    setErrors({});
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
          <Text style={s.title}>Create Your Account</Text>
          <Text style={s.sub}>{`Use the same ${settings.name || "Coy's Corner"} account across web and mobile ordering.`}</Text>
        </View>

        <View style={s.card}>
          <Input label="Full Name" value={name} onChangeText={setName} placeholder="Juan Dela Cruz" error={errors.name} />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" error={errors.email} />
          <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="09123456789" keyboardType="phone-pad" error={errors.phone} />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry error={errors.password} />
          {otpSent ? (
            <>
              <Text style={s.otpMessage}>{otpMessage}</Text>
              <Input
                label="Email OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                keyboardType="number-pad"
                error={errors.otp}
              />
            </>
          ) : null}

          <Btn
            title={otpSent ? "Verify OTP & Create Account" : "Send OTP"}
            onPress={submit}
            loading={loading}
            style={{ marginTop: 8 }}
          />
          {otpSent ? (
            <View style={s.otpActions}>
              <TouchableOpacity onPress={resendOtp} disabled={loading}>
                <Text style={s.link}>Resend OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={changeDetails} disabled={loading}>
                <Text style={s.link}>Change details</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <GoogleAuthButton onLogin={onLogin} onError={handleGoogleError} mode="register" style={{ marginTop: 12 }} />
          <FacebookAuthButton onLogin={onLogin} onError={handleFacebookError} mode="register" style={{ marginTop: 12 }} />

          <View style={s.footer}>
            <Text style={s.footerTxt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={s.link}>Sign in</Text>
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
  hero: { marginBottom: 24 },
  logo: { marginBottom: 18 },
  title: { fontSize: 32, fontWeight: "900", color: C.text, letterSpacing: -0.8 },
  sub: { fontSize: 15, color: C.textSec, lineHeight: 22, marginTop: 10 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    ...createShadow({ color: "#0f172a", opacity: 0.05, radius: 18, offsetY: 10, elevation: 2 }),
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerTxt: { fontSize: 14, color: C.textSec },
  link: { fontSize: 14, fontWeight: "800", color: C.primary },
  otpMessage: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderWidth: 1,
    borderRadius: 12,
    color: C.textSec,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    padding: 12,
  },
  otpActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
});
