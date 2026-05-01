import React from "react";
import { StyleSheet, Text, View } from "react-native";
import C from "../constants/colors";

const STATUS_MAP = {
  pending: { bg: "#FEF3C7", fg: C.warning },
  confirmed: { bg: "#DBEAFE", fg: C.info },
  arrived: { bg: "#EDE9FE", fg: "#6D28D9" },
  preparing: { bg: "#E0E7FF", fg: "#4338CA" },
  ready: { bg: "#DCFCE7", fg: C.success },
  completed: { bg: "#ECFCCB", fg: "#3F6212" },
  cancelled: { bg: "#FEE2E2", fg: C.error },
};

export default function Badge({ status }) {
  const colors = STATUS_MAP[status] || STATUS_MAP.pending;

  return (
    <View style={[s.badge, { backgroundColor: colors.bg }]}>
      <Text style={[s.text, { color: colors.fg }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "800",
  },
});
