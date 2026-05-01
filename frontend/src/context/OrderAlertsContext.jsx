import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { useToast } from "./ToastContext.jsx";
import { playNotificationSound } from "../utils/notificationSound.js";
import { getRealtimeUrl } from "../utils/realtime.js";
import { hasStaffPermission } from "../utils/staffPermissions.js";

const OrderAlertsContext = createContext(null);
const STORAGE_KEY = "web_unread_mobile_orders";

const getStoredUnreadCount = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  const value = Number(window.sessionStorage.getItem(STORAGE_KEY) || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const OrderAlertsProvider = ({ children }) => {
  const { user, token } = useAuth();
  const toast = useToast();
  const { pathname } = useLocation();
  const [unreadOrdersCount, setUnreadOrdersCount] = useState(getStoredUnreadCount);
  const notifiedOrderIdsRef = useRef(new Set());

  const canReceiveOrderAlerts = useMemo(() => {
    if (!user || !token) {
      return false;
    }

    if (user.role === "admin") {
      return true;
    }

    return user.role === "staff" && hasStaffPermission(user, "orders");
  }, [token, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (unreadOrdersCount > 0) {
      window.sessionStorage.setItem(STORAGE_KEY, String(unreadOrdersCount));
      return;
    }

    window.sessionStorage.removeItem(STORAGE_KEY);
  }, [unreadOrdersCount]);

  useEffect(() => {
    if (!pathname.startsWith("/orders")) {
      return;
    }

    setUnreadOrdersCount(0);
  }, [pathname]);

  useEffect(() => {
    if (canReceiveOrderAlerts) {
      return;
    }

    notifiedOrderIdsRef.current.clear();
    setUnreadOrdersCount(0);
  }, [canReceiveOrderAlerts]);

  useEffect(() => {
    if (!canReceiveOrderAlerts) {
      return undefined;
    }

    const socket = new WebSocket(getRealtimeUrl(token));

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== "order.created" || !payload.data) {
          return;
        }

        const orderId = String(payload.data.id || payload.data.orderNumber || "");
        if (!orderId || notifiedOrderIdsRef.current.has(orderId)) {
          return;
        }

        notifiedOrderIdsRef.current.add(orderId);

        if (pathname.startsWith("/orders")) {
          return;
        }

        setUnreadOrdersCount((current) => current + 1);
        void playNotificationSound();
        toast.info(`New mobile order ${payload.data.orderNumber}`);
      } catch {
        // Ignore malformed realtime payloads.
      }
    };

    return () => socket.close();
  }, [canReceiveOrderAlerts, pathname, toast, token]);

  const value = useMemo(() => ({
    unreadOrdersCount,
    clearUnreadOrders: () => setUnreadOrdersCount(0)
  }), [unreadOrdersCount]);

  return (
    <OrderAlertsContext.Provider value={value}>
      {children}
    </OrderAlertsContext.Provider>
  );
};

export const useOrderAlerts = () => {
  const context = useContext(OrderAlertsContext);
  if (!context) {
    throw new Error("useOrderAlerts must be used within OrderAlertsProvider");
  }
  return context;
};
