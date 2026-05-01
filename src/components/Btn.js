import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from "react-native";
import C from "../constants/colors";

export default function Btn({ title, onPress, variant, disabled, loading, style }) {
  const filled = variant !== "outline" && variant !== "ghost" && variant !== "danger";
  const isDanger = variant === "danger";
  const bg = filled ? C.primary : isDanger ? "#FEE2E2" : "transparent";
  const fg = filled ? C.white : isDanger ? C.error : C.primary;
  const bdr = variant === "outline" ? C.primary : "transparent";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[s.btn, { backgroundColor: bg, borderColor: bdr }, disabled && { opacity: 0.4 }, style]}
    >
      {loading
        ? <ActivityIndicator color={fg} />
        : <Text style={[s.txt, { color: fg }]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  txt: { fontSize: 16, fontWeight: "700" },
});
