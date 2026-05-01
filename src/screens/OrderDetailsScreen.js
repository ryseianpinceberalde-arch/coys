import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import Badge from "../components/Badge";
import Btn from "../components/Btn";
import C from "../constants/colors";
import { getGuestTrackedOrder, getOrderById } from "../services/api";
import { notifyOrderStatus, shouldNotifyOrderStatus } from "../services/notificationSound";
import { connectRealtime } from "../services/realtime";
import { getAuth } from "../services/storage";
import { fmt } from "../utils/helpers";

const FLOW = ["pending", "confirmed", "preparing", "ready", "completed"];
const PAYMENT_LABELS = {
  cash: "Cash",
  gcash: "GCash",
  qrph: "GCash QR",
  card: "Card",
  stripe: "Stripe",
};
const formatPaymentMethod = (paymentMethod) =>
  PAYMENT_LABELS[String(paymentMethod || "").toLowerCase()] || String(paymentMethod || "cash").toUpperCase();

const formatStatusNotice = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "ready") {
    return "Your order is ready.";
  }

  if (normalizedStatus === "completed") {
    return "Your order is complete.";
  }

  return `Status updated to ${normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}`;
};

export default function OrderDetailsScreen({ navigation, route, user }) {
  const initialOrder = route.params?.order || null;
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openingPayment, setOpeningPayment] = useState(false);

  const orderId = route.params?.orderId || initialOrder?.id || "";
  const orderNumber = route.params?.orderNumber || initialOrder?.orderNumber || "";
  const accessToken = route.params?.accessToken || initialOrder?.guestAccessToken || "";

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const nextOrder = user
        ? await getOrderById(orderId)
        : await getGuestTrackedOrder(orderNumber, accessToken);
      setOrder(nextOrder);
      setError("");
    } catch (err) {
      setError(err?.message || "Unable to load order details.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, orderId, orderNumber, user]);

  useEffect(() => {
    loadOrder().catch(() => {});
  }, [loadOrder]);

  useEffect(() => {
    let active = true;
    let socket;

    const connect = async () => {
      if (user) {
        const { token } = await getAuth();
        if (!active || !token) {
          return;
        }

        socket = connectRealtime({
          token,
          onMessage: (payload) => {
            if ((payload.type !== "order.created" && payload.type !== "order.updated") || !payload.data) {
              return;
            }

            if (payload.data.id !== orderId && payload.data.orderNumber !== orderNumber) {
              return;
            }

            setOrder((current) => {
              if (current?.status && current.status !== payload.data.status) {
                if (!user && shouldNotifyOrderStatus(payload.data.status)) {
                  void notifyOrderStatus(payload.data.status, payload.data.id || payload.data.orderNumber);
                }

                setNotice(formatStatusNotice(payload.data.status));
              }
              return payload.data;
            });
          },
        });
      } else if (orderNumber && accessToken) {
        socket = connectRealtime({
          orderNumber,
          accessToken,
          onMessage: (payload) => {
            if ((payload.type !== "order.created" && payload.type !== "order.updated") || !payload.data) {
              return;
            }

            if (payload.data.orderNumber !== orderNumber) {
              return;
            }

            setOrder((current) => {
              if (current?.status && current.status !== payload.data.status) {
                if (!user && shouldNotifyOrderStatus(payload.data.status)) {
                  void notifyOrderStatus(payload.data.status, payload.data.id || payload.data.orderNumber);
                }

                setNotice(formatStatusNotice(payload.data.status));
              }
              return payload.data;
            });
          },
        });
      }
    };

    connect().catch(() => {});

    return () => {
      active = false;
      socket?.close();
    };
  }, [accessToken, orderId, orderNumber, user]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const activeStep = useMemo(() => FLOW.indexOf(order?.status), [order?.status]);
  const canContinuePayment = Boolean(
    order?.paymentUrl
    && order?.paymentStatus !== "paid"
  );
  const paymentStatusLabel = String(order?.paymentStatus || "pending").toUpperCase();

  const openPayment = useCallback(async () => {
    if (!order?.paymentUrl) {
      return;
    }

    setOpeningPayment(true);

    try {
      await WebBrowser.openBrowserAsync(order.paymentUrl);
      await loadOrder();
    } catch (err) {
      setNotice(err?.message || "Unable to open the payment page.");
    } finally {
      setOpeningPayment(false);
    }
  }, [loadOrder, order?.paymentUrl]);

  useEffect(() => {
    if (!route.params?.autoOpenPayment || !canContinuePayment || openingPayment) {
      return;
    }

    navigation.setParams({ autoOpenPayment: false });
    openPayment().catch(() => {});
  }, [canContinuePayment, navigation, openPayment, openingPayment, route.params?.autoOpenPayment]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={C.primary} />
          <Text style={s.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>{error || "Order not found."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        {notice ? (
          <View style={s.notice}>
            <Text style={s.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <View style={s.hero}>
          <Text style={s.orderNumber}>{order.orderNumber}</Text>
          <Badge status={order.status} />
          <Text style={s.heroMeta}>{new Date(order.createdAt).toLocaleString()}</Text>
          <Text style={s.heroMeta}>Queue #{String(order.queueNumber || 0).padStart(3, "0")}</Text>
          <Text style={s.total}>{fmt(order.total)}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Payment</Text>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Method</Text>
            <Text style={s.metaValue}>{formatPaymentMethod(order.paymentMethod)}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Status</Text>
            <Text style={[s.metaValue, order.paymentStatus === "paid" ? s.paymentPaid : s.paymentPending]}>
              {paymentStatusLabel}
            </Text>
          </View>
          {order.paymentPaidAt ? (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Paid At</Text>
              <Text style={s.metaValue}>{new Date(order.paymentPaidAt).toLocaleString()}</Text>
            </View>
          ) : null}
          {canContinuePayment ? (
            <>
              <Text style={s.paymentHelp}>
                Complete your payment in the hosted checkout page, then return here to refresh the order.
              </Text>
              <Btn
                title={`Continue ${formatPaymentMethod(order.paymentMethod)} Payment`}
                onPress={openPayment}
                loading={openingPayment}
                style={{ marginTop: 14 }}
              />
            </>
          ) : null}
        </View>

        {order.status === "cancelled" ? (
          <View style={s.cancelCard}>
            <Text style={s.cancelTitle}>This order was cancelled</Text>
            <Text style={s.cancelBody}>{order.cancelReason || "The order was cancelled by staff."}</Text>
          </View>
        ) : (
          <View style={s.progressCard}>
            <Text style={s.cardTitle}>Live Status</Text>
            {FLOW.map((step, index) => {
              const done = activeStep >= index;
              return (
                <View key={step} style={s.stepRow}>
                  <View style={[s.stepDot, done && s.stepDotActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stepTitle, done && s.stepTitleActive]}>
                      {step.charAt(0).toUpperCase() + step.slice(1)}
                    </Text>
                    {index < FLOW.length - 1 ? <View style={[s.stepLine, done && s.stepLineActive]} /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={s.card}>
          <Text style={s.cardTitle}>Items</Text>
          {order.items.map((item) => (
            <View key={`${order.id}-${item.productId}`} style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.quantity}x {item.name}</Text>
                <Text style={s.itemMeta}>{fmt(item.price)} each</Text>
              </View>
              <Text style={s.itemTotal}>{fmt(item.subtotal)}</Text>
            </View>
          ))}

          <View style={s.divider} />
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Subtotal</Text>
            <Text style={s.metaValue}>{fmt(order.subtotal)}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Tax ({order.taxRate}%)</Text>
            <Text style={s.metaValue}>{fmt(order.taxAmount)}</Text>
          </View>
          <View style={[s.metaRow, { marginTop: 6 }]}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{fmt(order.total)}</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Timeline</Text>
          {order.timeline.map((entry, index) => (
            <View key={`${order.id}-entry-${index}`} style={s.timelineEntry}>
              <View style={s.timelineDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.timelineTitle}>
                  {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                </Text>
                <Text style={s.timelineMeta}>{new Date(entry.createdAt).toLocaleString()}</Text>
                {entry.note ? <Text style={s.timelineNote}>{entry.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: C.textSec, fontSize: 14 },
  notice: {
    backgroundColor: "#DBEAFE",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  noticeText: { color: C.info, fontSize: 13, fontWeight: "800" },
  hero: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  orderNumber: { color: C.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.6, marginBottom: 12 },
  heroMeta: { color: C.textSec, fontSize: 13, marginTop: 12 },
  total: { color: C.primary, fontSize: 24, fontWeight: "900", marginTop: 10 },
  progressCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 16,
  },
  cancelCard: {
    backgroundColor: "#FEE2E2",
    borderRadius: 24,
    padding: 18,
    marginTop: 16,
  },
  cancelTitle: { color: C.error, fontSize: 18, fontWeight: "900" },
  cancelBody: { color: "#7F1D1D", marginTop: 8, lineHeight: 20 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 16,
  },
  cardTitle: { color: C.text, fontSize: 18, fontWeight: "900", marginBottom: 14 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.border,
    marginTop: 4,
  },
  stepDotActive: {
    backgroundColor: C.primary,
  },
  stepTitle: { color: C.textSec, fontSize: 14, fontWeight: "700" },
  stepTitleActive: { color: C.text, fontWeight: "900" },
  stepLine: {
    width: 2,
    height: 22,
    backgroundColor: C.border,
    marginTop: 8,
    marginLeft: 6,
  },
  stepLineActive: {
    backgroundColor: C.primary,
  },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, gap: 12 },
  itemName: { color: C.text, fontSize: 14, fontWeight: "700" },
  itemMeta: { color: C.textSec, fontSize: 12, marginTop: 4 },
  itemTotal: { color: C.text, fontSize: 14, fontWeight: "800" },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  metaLabel: { color: C.textSec, fontSize: 14 },
  metaValue: { color: C.text, fontSize: 14, fontWeight: "700" },
  paymentPaid: { color: C.success },
  paymentPending: { color: C.warning },
  paymentHelp: { color: C.textSec, fontSize: 13, lineHeight: 18, marginTop: 14 },
  totalLabel: { color: C.text, fontSize: 16, fontWeight: "900" },
  totalValue: { color: C.primary, fontSize: 20, fontWeight: "900" },
  timelineEntry: { flexDirection: "row", gap: 12, marginBottom: 14 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primary,
    marginTop: 6,
  },
  timelineTitle: { color: C.text, fontSize: 14, fontWeight: "800" },
  timelineMeta: { color: C.textSec, fontSize: 12, marginTop: 4 },
  timelineNote: { color: C.textSec, fontSize: 13, marginTop: 6, lineHeight: 18 },
});
