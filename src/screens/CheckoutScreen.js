import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import C from "../constants/colors";
import Btn from "../components/Btn";
import Input from "../components/Input";
import { useCart } from "../context/CartContext";
import { createOrder, getStoreSettings } from "../services/api";
import { playNotificationSound } from "../services/notificationSound";
import { addGuestOrder, getGuestProfile, saveGuestProfile } from "../services/storage";
import { fmt, isValidEmail, isValidPhone } from "../utils/helpers";

const PAYMENT_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  qrph: "GCash QR",
  card: "Card",
  stripe: "Stripe",
};

export default function CheckoutScreen({ navigation, user, isGuest }) {
  const { items, subtotal, clearCart } = useCart();
  const [settings, setSettings] = useState({ taxRate: 0, paymentMethods: ["cash"] });
  const [customer, setCustomer] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setCustomer((current) => ({
      ...current,
      name: user.name || current.name,
      email: user.email || current.email,
      phone: user.phone || current.phone,
      address: user.address || current.address,
    }));
  }, [user]);

  useEffect(() => {
    let active = true;

    getStoreSettings()
      .then((value) => {
        if (active) {
          setSettings(value);
        }
      })
      .catch(() => {})
      .finally(async () => {
        if (!active || !isGuest) {
          return;
        }

        const guestProfile = await getGuestProfile();
        if (active) {
          setCustomer((current) => ({
            ...current,
            ...guestProfile,
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [isGuest, user]);

  const taxAmount = useMemo(() => subtotal * ((settings.taxRate || 0) / 100), [settings.taxRate, subtotal]);
  const total = subtotal + taxAmount;
  const paymentOptions = useMemo(
    () => (Array.isArray(settings.paymentMethods) ? settings.paymentMethods : ["cash"])
      .map((id) => ({ id, label: PAYMENT_LABELS[id] || String(id).toUpperCase() })),
    [settings.paymentMethods],
  );

  const setField = (key) => (value) => setCustomer((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (paymentOptions.some((option) => option.id === paymentMethod)) {
      return;
    }

    setPaymentMethod(paymentOptions[0]?.id || "cash");
  }, [paymentMethod, paymentOptions]);

  const submit = async () => {
    const nextErrors = {};
    if (!customer.name.trim()) nextErrors.name = "Required";
    if (!customer.email.trim()) nextErrors.email = "Required";
    else if (!isValidEmail(customer.email)) nextErrors.email = "Invalid email";
    if (!customer.phone.trim()) nextErrors.phone = "Required";
    else if (!isValidPhone(customer.phone)) nextErrors.phone = "Use 09XXXXXXXXX format";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const res = await createOrder({
        items,
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
        },
        paymentMethod,
        notes: notes.trim(),
      });

      if (isGuest && res.order.guestAccessToken) {
        await addGuestOrder({
          orderNumber: res.order.orderNumber,
          accessToken: res.order.guestAccessToken,
        });
        await saveGuestProfile(customer);
      }

      await clearCart();
      const shouldAutoOpenPayment = Boolean(
        paymentMethod !== "cash"
        && res.order.paymentStatus !== "paid"
        && res.order.paymentUrl
      );
      const successMessage = paymentMethod === "cash"
        ? `${res.order.orderNumber} was submitted successfully. Please proceed to the cashier for payment.`
        : shouldAutoOpenPayment
          ? `${res.order.orderNumber} was created. Complete the payment in the secure checkout page.`
          : `${res.order.orderNumber} was submitted successfully.`;

      await playNotificationSound();

      Alert.alert(
        "Order Placed",
        successMessage,
      );
      navigation.replace("OrderDetails", {
        orderId: res.order.id,
        order: res.order,
        orderNumber: res.order.orderNumber,
        accessToken: res.order.guestAccessToken || "",
        autoOpenPayment: shouldAutoOpenPayment,
      });
    } catch (error) {
      Alert.alert("Checkout Failed", error?.message || "Unable to place your order right now");
    } finally {
      setSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Btn title="Back to Cart" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Checkout</Text>
          <Text style={s.sub}>Confirm your details and place the order into the same POS system.</Text>

          <View style={s.card}>
            <Text style={s.cardTitle}>Order Summary</Text>
            {items.map((item) => (
              <View key={item.id} style={s.summaryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.summaryName}>{item.qty}x {item.name}</Text>
                  <Text style={s.summaryMeta}>{fmt(item.price)} each</Text>
                </View>
                <Text style={s.summaryValue}>{fmt(item.qty * item.price)}</Text>
              </View>
            ))}

            <View style={s.divider} />

            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>{fmt(subtotal)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Tax ({settings.taxRate || 0}%)</Text>
              <Text style={s.summaryValue}>{fmt(taxAmount)}</Text>
            </View>
            <View style={[s.summaryRow, { marginTop: 6 }]}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{fmt(total)}</Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Contact Details</Text>
            <Input label="Full Name" value={customer.name} onChangeText={setField("name")} placeholder="Juan Dela Cruz" error={errors.name} />
            <Input label="Email" value={customer.email} onChangeText={setField("email")} placeholder="you@example.com" keyboardType="email-address" error={errors.email} />
            <Input label="Phone" value={customer.phone} onChangeText={setField("phone")} placeholder="09123456789" keyboardType="phone-pad" error={errors.phone} />
            <Input label="Address" value={customer.address} onChangeText={setField("address")} placeholder="Optional pickup note or address" />
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Payment Method</Text>
            <View style={s.paymentRow}>
              {paymentOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  activeOpacity={0.85}
                  onPress={() => setPaymentMethod(option.id)}
                  style={[s.paymentChip, paymentMethod === option.id && s.paymentChipActive]}
                >
                  <Text style={[s.paymentText, paymentMethod === option.id && s.paymentTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.paymentHint}>
              {paymentMethod === "cash"
                ? "Cash orders are marked paid once staff completes the order."
                : paymentMethod === "stripe"
                  ? "Stripe opens a secure hosted checkout page after you place the order."
                  : paymentMethod === "qrph"
                    ? "GCash QR opens a hosted QR Ph page. Scan the QR with GCash or another QR Ph wallet to pay."
                    : "GCash and Card payments open a secure hosted checkout page after you place the order."}
            </Text>
            <Input label="Order Notes" value={notes} onChangeText={setNotes} placeholder="Optional note for staff" multiline style={{ marginTop: 12 }} />
          </View>

          <Btn title={`Place Order - ${fmt(total)}`} onPress={submit} loading={submitting} style={{ marginTop: 8, marginBottom: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: "900", color: C.text, letterSpacing: -0.6 },
  sub: { fontSize: 14, color: C.textSec, marginTop: 8, lineHeight: 20, marginBottom: 18 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 },
  summaryName: { fontSize: 14, fontWeight: "700", color: C.text },
  summaryMeta: { fontSize: 12, color: C.textSec, marginTop: 4 },
  summaryLabel: { fontSize: 14, color: C.textSec },
  summaryValue: { fontSize: 14, fontWeight: "700", color: C.text },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 6 },
  totalLabel: { fontSize: 16, fontWeight: "900", color: C.text },
  totalValue: { fontSize: 20, fontWeight: "900", color: C.primary },
  paymentRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  paymentChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  paymentChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  paymentText: { color: C.textSec, fontSize: 13, fontWeight: "800" },
  paymentTextActive: { color: C.white },
  paymentHint: { color: C.textSec, fontSize: 13, lineHeight: 18, marginTop: 12 },
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: C.text },
});
