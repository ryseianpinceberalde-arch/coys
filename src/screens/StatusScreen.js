import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../components/Badge";
import C from "../constants/colors";
import { getReservations } from "../services/api";
import { fmt } from "../utils/helpers";
import { createShadow } from "../utils/shadow";

const FILTERS = ["all", "pending", "confirmed", "arrived", "completed", "cancelled"];

const getTableMonitorLabel = (tableMonitor) => {
  switch (tableMonitor?.status) {
    case "free":
      return "Free";
    case "waiting":
      return "Waiting";
    case "reserved":
      return "Reserved";
    default:
      return "Unassigned";
  }
};

export default function StatusScreen({ navigation }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  const loadReservations = useCallback(async (mode = "load") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      setReservations(await getReservations());
      setError("");
    } catch (err) {
      setReservations([]);
      setError(err?.message || "Unable to load reservations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [loadReservations]),
  );

  const filtered = useMemo(
    () => (filter === "all" ? reservations : reservations.filter((item) => item.status === filter)),
    [filter, reservations],
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReservations("refresh")} tintColor={C.primary} />}
      >
        <TouchableOpacity style={s.newReservationBtn} activeOpacity={0.8} onPress={() => navigation.navigate("Reservation")}>
          <Text style={s.newReservationText}>Reserve Table</Text>
        </TouchableOpacity>

        <Text style={s.title}>My Reservations</Text>
        <Text style={s.sub}>Track your bookings and revisit previous reservation details.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setFilter(item)}
              activeOpacity={0.7}
              style={[s.filterChip, filter === item && s.filterChipActive]}
            >
              <Text style={[s.filterText, filter === item && s.filterTextActive]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && !reservations.length ? <Text style={s.loading}>Loading reservations...</Text> : null}
        {!!error && !loading ? <Text style={s.error}>{error}</Text> : null}

        {!loading && !error && !filtered.length ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>{"\uD83D\uDCCB"}</Text>
            <Text style={s.emptyTitle}>No reservations found</Text>
            <Text style={s.emptySub}>Create a new reservation and it will appear here right away.</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Reservation")} activeOpacity={0.7} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>Make a Reservation</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {filtered.map((item) => (
          <View key={item.id} style={s.card}>
            <View style={s.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardId}>{item.id}</Text>
                <Text style={s.cardMeta}>{item.date} at {item.time}</Text>
              </View>
              <Badge status={item.status} />
            </View>

            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Guest</Text>
              <Text style={s.detailValue}>{item.customer.name}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Contact</Text>
              <Text style={s.detailValue}>{item.customer.phone}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Items</Text>
              <Text style={s.detailValue}>{item.items.reduce((sum, entry) => sum + entry.qty, 0)} selected</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Party Size</Text>
              <Text style={s.detailValue}>{item.partySize || 1} guest(s)</Text>
            </View>
            {!!item.tableLabel && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Table</Text>
                <Text style={s.detailValue}>{item.tableLabel}</Text>
              </View>
            )}
            {item.tableMonitor?.tracked && (
              <>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>Table Status</Text>
                  <View
                    style={[
                      s.tableMonitorBadge,
                      item.tableMonitor.status === "free"
                        ? s.tableMonitorBadgeFree
                        : item.tableMonitor.status === "waiting"
                          ? s.tableMonitorBadgeWaiting
                          : s.tableMonitorBadgeReserved,
                    ]}
                  >
                    <Text style={s.tableMonitorBadgeText}>{getTableMonitorLabel(item.tableMonitor)}</Text>
                  </View>
                </View>
                {item.tableMonitor.queuePosition ? (
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>Queue Position</Text>
                    <Text style={s.detailValue}>#{item.tableMonitor.queuePosition}</Text>
                  </View>
                ) : null}
                {!!item.tableMonitor.message && <Text style={s.monitorText}>{item.tableMonitor.message}</Text>}
              </>
            )}
            {!!item.arrivedAt && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Arrived</Text>
                <Text style={s.detailValue}>{new Date(item.arrivedAt).toLocaleString()}</Text>
              </View>
            )}

            <View style={s.itemsBox}>
              {item.items.map((entry) => (
                <View key={`${item.id}-${entry.name}`} style={s.itemRow}>
                  <Text style={s.itemText}>{entry.qty}x {entry.name}</Text>
                  <Text style={s.itemPrice}>{fmt(entry.qty * entry.price)}</Text>
                </View>
              ))}
            </View>

            {!!item.notes && <Text style={s.noteText}>Notes: {item.notes}</Text>}

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{fmt(item.total)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "800", color: C.text },
  sub: { fontSize: 14, color: C.textSec, marginTop: 4 },
  newReservationBtn: {
    alignSelf: "flex-end",
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  newReservationText: { color: C.white, fontSize: 13, fontWeight: "800" },
  filterRow: { paddingVertical: 16, paddingRight: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: "700", color: C.textSec },
  filterTextActive: { color: C.white },
  loading: { color: C.textSec, marginTop: 10, marginBottom: 4 },
  error: { color: C.error, marginTop: 10, marginBottom: 4 },
  emptyCard: { backgroundColor: C.surface, borderRadius: 16, padding: 24, alignItems: "center", marginTop: 12 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  emptySub: { fontSize: 13, color: C.textSec, textAlign: "center", marginTop: 6, marginBottom: 18 },
  emptyBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: C.white },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 12, ...createShadow() },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardId: { fontSize: 15, fontWeight: "800", color: C.text },
  cardMeta: { fontSize: 12, color: C.textSec, marginTop: 4 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  detailLabel: { fontSize: 12, color: C.textSec },
  detailValue: { fontSize: 12, fontWeight: "700", color: C.text },
  tableMonitorBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tableMonitorBadgeFree: { backgroundColor: "#dcfce7" },
  tableMonitorBadgeReserved: { backgroundColor: "#fef3c7" },
  tableMonitorBadgeWaiting: { backgroundColor: "#dbeafe" },
  tableMonitorBadgeText: { fontSize: 11, fontWeight: "800", color: C.text },
  monitorText: { fontSize: 12, color: C.textSec, marginTop: 8, lineHeight: 18 },
  itemsBox: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 12, marginTop: 14 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  itemText: { flex: 1, fontSize: 13, color: C.text },
  itemPrice: { fontSize: 13, fontWeight: "700", color: C.primary, marginLeft: 12 },
  noteText: { fontSize: 12, color: C.textSec, marginTop: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.divider },
  totalLabel: { fontSize: 14, fontWeight: "700", color: C.text },
  totalValue: { fontSize: 16, fontWeight: "800", color: C.primary },
});
