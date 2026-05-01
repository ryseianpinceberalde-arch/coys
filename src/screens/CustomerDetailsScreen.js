import React, { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Btn from "../components/Btn";
import Input from "../components/Input";
import C from "../constants/colors";
import { createReservation, getReservationTableStatus } from "../services/api";
import { fmt, formatTime, isValidEmail, isValidPhone } from "../utils/helpers";
import { createShadow } from "../utils/shadow";

export default function CustomerDetailsScreen({ route, navigation, user }) {
  const { date, time, cart, notes, total } = route.params;
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [partySize, setPartySize] = useState("2");
  const [tableLabel, setTableLabel] = useState("");
  const [tableMonitor, setTableMonitor] = useState(null);
  const [checkingTable, setCheckingTable] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const reservationDateKey = date?.key || date;
  const hasTrackedTable = tableLabel.trim().length > 0;

  useEffect(() => {
    if (!hasTrackedTable || !reservationDateKey || !time) {
      setTableMonitor(null);
      setCheckingTable(false);
      return undefined;
    }

    let active = true;
    setCheckingTable(true);

    const timeoutId = setTimeout(async () => {
      try {
        const nextMonitor = await getReservationTableStatus(reservationDateKey, time, tableLabel);
        if (active) {
          setTableMonitor(nextMonitor);
        }
      } catch (error) {
        if (active) {
          setTableMonitor({
            tracked: true,
            isFree: null,
            isFirstInLine: false,
            queuePosition: null,
            nextQueuePosition: null,
            activeReservations: 0,
            status: "unknown",
            message: error?.message || "Unable to check table availability right now.",
          });
        }
      } finally {
        if (active) {
          setCheckingTable(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [hasTrackedTable, reservationDateKey, tableLabel, time]);

  const tableMonitorStyle = useMemo(() => {
    if (!tableMonitor) {
      return s.tableMonitorNeutral;
    }

    if (tableMonitor.status === "free") {
      return s.tableMonitorFree;
    }

    if (tableMonitor.status === "waiting") {
      return s.tableMonitorWaiting;
    }

    if (tableMonitor.status === "reserved") {
      return s.tableMonitorReserved;
    }

    return s.tableMonitorNeutral;
  }, [tableMonitor]);

  const submit = async () => {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "Required";
    if (!email.trim()) nextErrors.email = "Required";
    else if (!isValidEmail(email)) nextErrors.email = "Invalid email";
    if (!phone.trim()) nextErrors.phone = "Required";
    else if (!isValidPhone(phone)) nextErrors.phone = "Use 09XXXXXXXXX format";
    if (!Number.isInteger(Number(partySize)) || Number(partySize) < 1) nextErrors.partySize = "Enter at least 1 guest";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const res = await createReservation({
        date,
        time,
        cart,
        notes,
        total,
        customer: { name: name.trim(), email: email.trim(), phone: phone.trim() },
        partySize: Number(partySize),
        tableLabel: tableLabel.trim(),
      });

      if (res.ok) {
        Alert.alert("Reservation Submitted", `Reference: ${res.id}`, [
          {
            text: "View Status",
            onPress: () => navigation.navigate("MainTabs", { screen: "ReservationsTab" }),
          },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", error?.message || "Unable to submit reservation right now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Customer Details</Text>
          <Text style={s.sub}>Review your reservation and confirm your contact information.</Text>

          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Date</Text>
              <Text style={s.summaryValue}>{date.full}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Time</Text>
              <Text style={s.summaryValue}>{formatTime(time)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Items</Text>
              <Text style={s.summaryValue}>{itemCount} selected</Text>
            </View>
            <View style={s.divider} />
            {cart.map((item) => (
              <View key={item.id} style={s.itemRow}>
                <View style={s.itemMain}>
                  <Text style={s.itemEmoji}>{item.emoji}</Text>
                  <View>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemMeta}>Qty {item.qty}</Text>
                  </View>
                </View>
                <Text style={s.itemPrice}>{fmt(item.qty * item.price)}</Text>
              </View>
            ))}
            {!!notes && (
              <View style={s.noteBox}>
                <Text style={s.noteLabel}>Notes</Text>
                <Text style={s.noteText}>{notes}</Text>
              </View>
            )}
            <View style={[s.summaryRow, { marginTop: 14 }]}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{fmt(total)}</Text>
            </View>
          </View>

          <View style={s.formCard}>
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="Juan Dela Cruz" error={errors.name} />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" error={errors.email} />
            <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="09123456789" keyboardType="phone-pad" error={errors.phone} />
            <Input label="Party Size" value={partySize} onChangeText={setPartySize} placeholder="2" keyboardType="number-pad" error={errors.partySize} />
            <Input label="Table / Area (optional)" value={tableLabel} onChangeText={setTableLabel} placeholder="Window, Family table, Table 4..." />
            {hasTrackedTable ? (
              <View style={[s.tableMonitorBox, tableMonitorStyle]}>
                <Text style={s.tableMonitorTitle}>
                  {checkingTable
                    ? "Checking table availability..."
                    : tableMonitor?.status === "free"
                      ? "Table is free"
                      : tableMonitor?.status === "waiting"
                        ? "Table already has a queue"
                        : "Table is currently reserved"}
                </Text>
                <Text style={s.tableMonitorText}>
                  {checkingTable
                    ? `Checking ${tableLabel.trim()} for ${date?.full || reservationDateKey} at ${formatTime(time)}.`
                    : tableMonitor?.message || "No table status available right now."}
                </Text>
                {!checkingTable && tableMonitor?.nextQueuePosition > 1 ? (
                  <Text style={s.tableMonitorQueue}>If you continue, your reservation will be placed at queue #{tableMonitor.nextQueuePosition}.</Text>
                ) : null}
              </View>
            ) : null}
            <Btn title={`Confirm Reservation - ${fmt(total)}`} onPress={submit} loading={loading} style={{ marginTop: 8 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "800", color: C.text },
  sub: { fontSize: 14, color: C.textSec, marginTop: 4, marginBottom: 18 },
  summaryCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 16, ...createShadow() },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontWeight: "600", color: C.textSec },
  summaryValue: { fontSize: 13, fontWeight: "700", color: C.text },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 14 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  itemMain: { flexDirection: "row", alignItems: "center" },
  itemEmoji: { fontSize: 20, marginRight: 10 },
  itemName: { fontSize: 14, fontWeight: "700", color: C.text },
  itemMeta: { fontSize: 12, color: C.textSec, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: "700", color: C.primary },
  noteBox: { backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 12, marginTop: 10 },
  noteLabel: { fontSize: 12, fontWeight: "700", color: C.textSec, marginBottom: 4 },
  noteText: { fontSize: 13, color: C.text },
  totalLabel: { fontSize: 16, fontWeight: "800", color: C.text },
  totalValue: { fontSize: 18, fontWeight: "800", color: C.primary },
  formCard: { backgroundColor: C.surface, borderRadius: 16, padding: 18, ...createShadow() },
  tableMonitorBox: { borderRadius: 12, padding: 12, marginTop: 2, marginBottom: 8, borderWidth: 1 },
  tableMonitorNeutral: { backgroundColor: C.surfaceAlt, borderColor: C.border },
  tableMonitorFree: { backgroundColor: "#dcfce7", borderColor: "#22c55e" },
  tableMonitorReserved: { backgroundColor: "#fef3c7", borderColor: "#f59e0b" },
  tableMonitorWaiting: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
  tableMonitorTitle: { fontSize: 13, fontWeight: "800", color: C.text },
  tableMonitorText: { fontSize: 12, color: C.textSec, marginTop: 4, lineHeight: 18 },
  tableMonitorQueue: { fontSize: 12, fontWeight: "700", color: C.text, marginTop: 6 },
});
