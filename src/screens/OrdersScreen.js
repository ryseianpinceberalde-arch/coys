import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../components/Badge";
import C from "../constants/colors";
import { getGuestTrackedOrder, getMyOrders } from "../services/api";
import { connectRealtime } from "../services/realtime";
import { getAuth, getGuestOrders } from "../services/storage";
import { fmt } from "../utils/helpers";

const FILTERS = ["all", "pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
const PAYMENT_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  qrph: "GCash QR",
  card: "Card",
  stripe: "Stripe",
};
const formatPaymentMethod = (paymentMethod) =>
  PAYMENT_LABELS[String(paymentMethod || "").toLowerCase()] || String(paymentMethod || "cash").toUpperCase();

export default function OrdersScreen({ navigation, onViewed, onFocusChange, user, isGuest }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (mode = "load") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      if (user) {
        setOrders(await getMyOrders());
      } else {
        const trackedRefs = await getGuestOrders();
        const guestOrderResults = await Promise.allSettled(
          trackedRefs.map(async (entry) => ({
            ...(await getGuestTrackedOrder(entry.orderNumber, entry.accessToken)),
            guestAccessToken: entry.accessToken,
          }))
        );
        const guestOrders = guestOrderResults
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value);
        setOrders(guestOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
      setError("");
    } catch (err) {
      setOrders([]);
      setError(err?.message || "Unable to load orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      onFocusChange?.(true);
      onViewed?.();
      loadOrders();

      return () => {
        onFocusChange?.(false);
      };
    }, [loadOrders, onFocusChange, onViewed]),
  );

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let socket;
    let mounted = true;

    getAuth().then(({ token }) => {
      if (!mounted || !token) {
        return;
      }

      socket = connectRealtime({
        token,
        onMessage: (payload) => {
          if (payload.type !== "order.created" && payload.type !== "order.updated") {
            return;
          }

          setOrders((prev) => {
            const nextOrder = payload.data;
            const exists = prev.some((entry) => entry.id === nextOrder.id);
            if (!exists) {
              return [nextOrder, ...prev];
            }
            return prev.map((entry) => (entry.id === nextOrder.id ? nextOrder : entry));
          });
        },
      });
    });

    return () => {
      mounted = false;
      socket?.close();
    };
  }, [user]);

  const filteredOrders = useMemo(
    () => (filter === "all" ? orders : orders.filter((item) => item.status === filter)),
    [filter, orders],
  );

  const openOrder = (order) => {
    const params = {
      orderId: order.id,
      order,
      orderNumber: order.orderNumber,
      accessToken: order.guestAccessToken || "",
    };
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate("OrderDetails", params);
      return;
    }
    navigation.navigate("OrderDetails", params);
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders("refresh")} tintColor={C.primary} />}
      >
        <Text style={s.title}>My Orders</Text>
        <Text style={s.sub}>Track every order from submission to pickup.</Text>

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

        {loading && !orders.length ? <Text style={s.loading}>Loading orders...</Text> : null}
        {!!error && !loading ? <Text style={s.error}>{error}</Text> : null}

        {!loading && !error && !filteredOrders.length ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>{"\uD83D\uDCCB"}</Text>
            <Text style={s.emptyTitle}>No orders yet</Text>
            <Text style={s.emptySub}>Place your first order and it will appear here instantly.</Text>
            <TouchableOpacity onPress={() => navigation.navigate("HomeTab")} activeOpacity={0.8} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {filteredOrders.map((order) => (
          <TouchableOpacity key={order.id} style={s.card} activeOpacity={0.88} onPress={() => openOrder(order)}>
            <View style={s.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardId}>{order.orderNumber}</Text>
                <Text style={s.cardMeta}>{new Date(order.createdAt).toLocaleString()}</Text>
              </View>
              <Badge status={order.status} />
            </View>

            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Items</Text>
              <Text style={s.metaValue}>{order.items.reduce((sum, item) => sum + item.quantity, 0)} selected</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Queue</Text>
              <Text style={s.metaValue}>#{String(order.queueNumber || 0).padStart(3, "0")}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Payment</Text>
              <Text style={s.metaValue}>{formatPaymentMethod(order.paymentMethod)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Payment Status</Text>
              <Text style={[s.metaValue, order.paymentStatus === "paid" ? s.paymentPaid : s.paymentPending]}>
                {String(order.paymentStatus || "pending").toUpperCase()}
              </Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Total</Text>
              <Text style={s.totalValue}>{fmt(order.total)}</Text>
            </View>

            <View style={s.itemsPreview}>
              {order.items.slice(0, 2).map((item) => (
                <Text key={`${order.id}-${item.productId}`} style={s.previewText}>
                  {item.quantity}x {item.name}
                </Text>
              ))}
              {order.items.length > 2 ? <Text style={s.previewMore}>+{order.items.length - 2} more</Text> : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: "900", color: C.text, letterSpacing: -0.6 },
  sub: { fontSize: 14, color: C.textSec, marginTop: 8 },
  filterRow: { paddingVertical: 16, paddingRight: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: "700", color: C.textSec },
  filterTextActive: { color: C.white },
  loading: { color: C.textSec, marginTop: 10, marginBottom: 4 },
  error: { color: C.error, marginTop: 10, marginBottom: 4 },
  emptyCard: { backgroundColor: C.surface, borderRadius: 22, padding: 24, alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: C.border },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  emptySub: { fontSize: 13, color: C.textSec, textAlign: "center", marginTop: 6, marginBottom: 18 },
  emptyBtn: { backgroundColor: C.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: "800", color: C.white },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 16, marginTop: 12, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardId: { fontSize: 15, fontWeight: "900", color: C.text },
  cardMeta: { fontSize: 12, color: C.textSec, marginTop: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  metaLabel: { fontSize: 12, color: C.textSec },
  metaValue: { fontSize: 13, fontWeight: "700", color: C.text },
  paymentPaid: { color: C.success },
  paymentPending: { color: C.warning },
  totalValue: { fontSize: 15, fontWeight: "900", color: C.primary },
  itemsPreview: { backgroundColor: C.surfaceAlt, borderRadius: 14, padding: 12, marginTop: 14 },
  previewText: { fontSize: 13, color: C.text, marginBottom: 6 },
  previewMore: { fontSize: 12, color: C.textSec, fontWeight: "700" },
});
