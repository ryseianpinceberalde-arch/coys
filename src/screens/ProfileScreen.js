import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Btn from "../components/Btn";
import Input from "../components/Input";
import C from "../constants/colors";
import { getMyOrders, updateCurrentUser } from "../services/api";
import { getGuestOrders } from "../services/storage";
import { isValidPhone } from "../utils/helpers";

export default function ProfileScreen({
  navigation,
  onLogout,
  onShowLogin,
  onShowRegister,
  onUserUpdate,
  user,
  isGuest,
  onExitGuest,
}) {
  const [orderCount, setOrderCount] = useState(0);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        if (user) {
          try {
            const orders = await getMyOrders();
            if (active) {
              setOrderCount(orders.length);
            }
          } catch {
            if (active) {
              setOrderCount(0);
            }
          }
        } else {
          const guestOrders = await getGuestOrders();
          if (active) {
            setOrderCount(guestOrders.length);
          }
        }
      };

      load();
      return () => {
        active = false;
      };
    }, [user]),
  );

  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const saveProfile = async () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Required";
    if (form.phone.trim() && !isValidPhone(form.phone)) nextErrors.phone = "Use 09XXXXXXXXX format";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const updatedUser = await updateCurrentUser({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      onUserUpdate(updatedUser);
      Alert.alert("Profile Updated", "Your account details were saved.");
    } catch (error) {
      Alert.alert("Update Failed", error?.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Sign Out", "Do you want to sign out of Coy's Corner?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: onLogout },
    ]);
  };

  if (isGuest) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.hero}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>G</Text>
            </View>
            <Text style={s.name}>Guest Mode</Text>
            <Text style={s.email}>You can browse, order, and track guest orders on this device.</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Guest Summary</Text>
            <View style={s.statCard}>
              <Text style={s.statValue}>{orderCount}</Text>
              <Text style={s.statLabel}>Tracked guest orders</Text>
            </View>
            <Btn
              title="Sign In"
              onPress={onShowLogin}
              style={{ marginTop: 16 }}
            />
            <Btn
              title="Create Account"
              onPress={onShowRegister}
              variant="outline"
              style={{ marginTop: 10 }}
            />
            <Btn title="Exit Guest Mode" onPress={onExitGuest} variant="ghost" style={{ marginTop: 10 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user?.name || "C").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.name}>{user?.name || "Customer"}</Text>
          <Text style={s.email}>{user?.email || ""}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Account Overview</Text>
          <View style={s.statCard}>
            <Text style={s.statValue}>{orderCount}</Text>
            <Text style={s.statLabel}>Orders placed</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Edit Profile</Text>
          <Input label="Full Name" value={form.name} onChangeText={setField("name")} placeholder="Juan Dela Cruz" error={errors.name} />
          <View style={s.readonlyField}>
            <Text style={s.readonlyLabel}>Email</Text>
            <Text style={s.readonlyValue}>{form.email}</Text>
          </View>
          <Input label="Phone" value={form.phone} onChangeText={setField("phone")} placeholder="09123456789" keyboardType="phone-pad" error={errors.phone} />
          <Input label="Address" value={form.address} onChangeText={setField("address")} placeholder="Optional address" />
          <Btn title="Save Changes" onPress={saveProfile} loading={saving} style={{ marginTop: 8 }} />
        </View>

        <Btn title="Sign Out" onPress={confirmLogout} variant="danger" style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  hero: { backgroundColor: C.secondary, borderRadius: 24, padding: 24, alignItems: "center" },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatarText: { fontSize: 30, fontWeight: "900", color: C.white },
  name: { fontSize: 24, fontWeight: "900", color: C.white },
  email: { fontSize: 14, color: C.textMuted, marginTop: 6, textAlign: "center", lineHeight: 20 },
  card: { backgroundColor: C.surface, borderRadius: 22, padding: 18, marginTop: 16, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 14 },
  statCard: { backgroundColor: C.surfaceAlt, borderRadius: 16, padding: 16 },
  statValue: { fontSize: 22, fontWeight: "900", color: C.primary },
  statLabel: { fontSize: 12, color: C.textSec, marginTop: 4, fontWeight: "700" },
  readonlyField: {
    marginBottom: 14,
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
    padding: 14,
  },
  readonlyLabel: { fontSize: 13, fontWeight: "700", color: C.textSec, marginBottom: 6 },
  readonlyValue: { fontSize: 15, color: C.text, fontWeight: "700" },
});
