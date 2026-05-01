import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_KEY = "@auth";
const CART_KEY = "@mobile_cart";
const GUEST_ORDERS_KEY = "@guest_orders";
const GUEST_PROFILE_KEY = "@guest_profile";
const ORDER_ALERTS_KEY = "@order_alerts";
const guestOrdersListeners = new Set();

const readJson = async (key, fallback) => {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
};

const notifyGuestOrdersListeners = (orders) => {
  guestOrdersListeners.forEach((listener) => {
    try {
      listener(orders);
    } catch {
      // Storage listeners should never break the save flow.
    }
  });
};

export const saveAuth = async (token, user) => {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
};

export const getAuth = async () => {
  return readJson(AUTH_KEY, { token: null, user: null });
};

export const clearAuth = async () => {
  await AsyncStorage.removeItem(AUTH_KEY);
};

export const saveCart = async (items) => {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
};

export const getCart = async () => {
  return readJson(CART_KEY, []);
};

export const clearCartStorage = async () => {
  await AsyncStorage.removeItem(CART_KEY);
};

export const getGuestOrders = async () => {
  return readJson(GUEST_ORDERS_KEY, []);
};

export const saveGuestOrders = async (orders) => {
  await AsyncStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify(orders));
  notifyGuestOrdersListeners(orders);
};

export const addGuestOrder = async (orderRef) => {
  const current = await getGuestOrders();
  const next = [orderRef, ...current.filter((entry) => entry.orderNumber !== orderRef.orderNumber)];
  await saveGuestOrders(next);
  return next;
};

export const subscribeGuestOrders = (listener) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  guestOrdersListeners.add(listener);
  return () => {
    guestOrdersListeners.delete(listener);
  };
};

export const saveGuestProfile = async (profile) => {
  await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
};

export const getGuestProfile = async () => {
  return readJson(GUEST_PROFILE_KEY, {
    name: "",
    email: "",
    phone: "",
    address: ""
  });
};

export const getOrderAlertsState = async () => {
  const stored = await readJson(ORDER_ALERTS_KEY, { unreadCount: 0 });
  const unreadCount = Number(stored?.unreadCount || 0);

  return {
    unreadCount: Number.isFinite(unreadCount) && unreadCount > 0 ? unreadCount : 0
  };
};

export const saveOrderAlertsState = async (state) => {
  const unreadCount = Number(state?.unreadCount || 0);

  await AsyncStorage.setItem(
    ORDER_ALERTS_KEY,
    JSON.stringify({
      unreadCount: Number.isFinite(unreadCount) && unreadCount > 0 ? unreadCount : 0
    })
  );
};
