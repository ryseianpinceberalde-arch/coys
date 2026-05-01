import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import StoreLogo from "../components/StoreLogo";
import C from "../constants/colors";
import { getStoreSettings } from "../services/api";

const DEFAULT_MINIMUM_DURATION_MS = 500;

export default function SplashScreen({
  onFinish,
  minimumDurationMs = DEFAULT_MINIMUM_DURATION_MS,
}) {
  const [settings, setSettings] = useState({ name: "Coy's Corner", logoUrl: "" });

  useEffect(() => {
    const timer = setTimeout(onFinish, minimumDurationMs);
    return () => clearTimeout(timer);
  }, [minimumDurationMs, onFinish]);

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

  return (
    <View style={s.container}>
      <StoreLogo logoUrl={settings.logoUrl} size={100} borderRadius={28} style={s.logo} />
      <Text style={s.title}>{settings.name || "Coy's Corner"}</Text>
      <Text style={s.sub}>Order ahead and track your status live</Text>
      <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 30 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.secondary,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logo: {
    marginBottom: 20,
  },
  title: { fontSize: 30, fontWeight: "800", color: C.white },
  sub: { fontSize: 14, color: C.textMuted, marginTop: 6 },
});
