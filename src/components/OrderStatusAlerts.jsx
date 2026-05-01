import { useEffect, useRef } from "react";
import { connectRealtime } from "../services/realtime";
import {
  notifyNewOrder,
  notifyOrderReady,
  notifyOrderStatus,
  shouldNotifyOrderStatus,
} from "../services/notificationSound";
import { getAuth, getGuestOrders, subscribeGuestOrders } from "../services/storage";

const getOrderIdentity = (order) =>
  String(order?.id || order?._id || order?.orderNumber || "");

const getGuestOrderKey = (entry) =>
  `${String(entry?.orderNumber || "").trim()}::${String(entry?.accessToken || "").trim()}`;

const canReceiveStaffOrderAlerts = (user) => user?.role === "admin" || user?.role === "staff";

export default function OrderStatusAlerts({ user, onNewOrder, onOrderReady }) {
  const latestStatusRef = useRef(new Map());
  const notifiedCreatedOrdersRef = useRef(new Set());

  useEffect(() => {
    let active = true;
    let socket;
    let guestSockets = [];
    let unsubscribeGuestOrders = () => {};

    const closeGuestSockets = () => {
      guestSockets.forEach((entry) => entry?.close?.());
      guestSockets = [];
    };

    const handleOrderUpdate = (payload) => {
      if (!payload.data) {
        return;
      }

      if (payload.type === "order.created") {
        if (!canReceiveStaffOrderAlerts(user)) {
          return;
        }

        const orderId = getOrderIdentity(payload.data);
        if (!orderId || notifiedCreatedOrdersRef.current.has(orderId)) {
          return;
        }

        notifiedCreatedOrdersRef.current.add(orderId);
        onNewOrder?.(payload.data);
        void notifyNewOrder(payload.data);
        return;
      }

      if (payload.type !== "order.updated") {
        return;
      }

      const status = String(payload.data.status || "").toLowerCase();
      if (!shouldNotifyOrderStatus(status)) {
        return;
      }

      const orderId = getOrderIdentity(payload.data);
      if (!orderId) {
        return;
      }

      const previousStatus = latestStatusRef.current.get(orderId);
      if (previousStatus === status) {
        return;
      }

      latestStatusRef.current.set(orderId, status);

      if (status === "ready") {
        void notifyOrderReady(payload.data, { onInAppAlert: onOrderReady });
        return;
      }

      void notifyOrderStatus(status, orderId, payload.data);
    };

    const connectGuestOrderSockets = async (trackedOrders = null) => {
      const nextTrackedOrders = Array.isArray(trackedOrders) ? trackedOrders : await getGuestOrders();
      if (!active) {
        return;
      }

      closeGuestSockets();

      const seenKeys = new Set();
      nextTrackedOrders.forEach((entry) => {
        const orderNumber = String(entry?.orderNumber || "").trim();
        const accessToken = String(entry?.accessToken || "").trim();
        const guestKey = getGuestOrderKey(entry);

        if (!orderNumber || !accessToken || seenKeys.has(guestKey)) {
          return;
        }

        seenKeys.add(guestKey);
        guestSockets.push(connectRealtime({
          orderNumber,
          accessToken,
          onMessage: handleOrderUpdate,
        }));
      });
    };

    if (user) {
      latestStatusRef.current.clear();
      notifiedCreatedOrdersRef.current.clear();

      getAuth().then(({ token }) => {
        if (!active || !token) {
          return;
        }

        socket = connectRealtime({
          token,
          onMessage: handleOrderUpdate,
        });
      }).catch(() => {});
    } else {
      latestStatusRef.current.clear();
      notifiedCreatedOrdersRef.current.clear();

      connectGuestOrderSockets().catch(() => {});
      unsubscribeGuestOrders = subscribeGuestOrders((trackedOrders) => {
        connectGuestOrderSockets(trackedOrders).catch(() => {});
      });
    }

    return () => {
      active = false;
      unsubscribeGuestOrders();
      socket?.close();
      closeGuestSockets();
    };
  }, [onNewOrder, onOrderReady, user]);

  return null;
}
