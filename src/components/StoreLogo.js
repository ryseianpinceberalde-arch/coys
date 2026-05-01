import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import C from "../constants/colors";

export default function StoreLogo({
  logoUrl,
  size = 72,
  borderRadius = 20,
  backgroundColor = C.primary,
  fallback = "\uD83C\uDF7D\uFE0F",
  style,
}) {
  return (
    <View
      style={[
        s.base,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: logoUrl ? "transparent" : backgroundColor,
          borderWidth: logoUrl ? 0 : 1,
        },
        style,
      ]}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={{ width: "100%", height: "100%", borderRadius }}
          resizeMode="contain"
        />
      ) : (
        <Text style={[s.fallback, { fontSize: size * 0.42 }]}>{fallback}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    overflow: "hidden",
  },
  fallback: {
    color: C.white,
  },
});
