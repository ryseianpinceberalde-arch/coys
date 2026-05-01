import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import C from "../constants/colors";

export default function Input({ label, value, onChangeText, placeholder, error, secureTextEntry, keyboardType, multiline, style }) {
  return (
    <View style={[s.wrap, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || "default"}
        multiline={multiline}
        style={[s.input, multiline && { minHeight: 80, textAlignVertical: "top" }, error && { borderColor: C.error }]}
      />
      {error ? <Text style={s.err}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: C.textSec, marginBottom: 6 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text },
  err: { fontSize: 12, color: C.error, marginTop: 4 },
});
