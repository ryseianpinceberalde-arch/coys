import Constants from "expo-constants";
import { Platform } from "react-native";
import { categories as fallbackCategories } from "../constants/data";
import { getAuth } from "./storage";

const CATEGORY_ICON_MAP = {
  all: "\uD83D\uDCCB",
  drink: "\uD83E\uDD64",
  drinks: "\uD83E\uDD64",
  beverage: "\uD83E\uDD64",
  beverages: "\uD83E\uDD64",
  meal: "\uD83C\uDF5B",
  meals: "\uD83C\uDF5B",
  snack: "\uD83C\uDF5F",
  snacks: "\uD83C\uDF5F",
  dessert: "\uD83C\uDF70",
  desserts: "\uD83C\uDF70",
  canned: "\uD83E\uDD6B",
  frozen: "\uD83C\uDF66",
  bakery: "\uD83C\uDF5E",
  condiment: "\uD83E\uDD6B",
};

const PRODUCT_EMOJI_RULES = [
  { regex: /coffee|latte|espresso|tea|cappuccino|americano/i, emoji: "\u2615" },
  { regex: /smoothie|shake|juice|drink|beverage|soda|milk/i, emoji: "\uD83E\uDD64" },
  { regex: /rice|meal|burger|chicken|pork|beef|adobo|sisig|nugget|hotdog/i, emoji: "\uD83C\uDF57" },
  { regex: /fries|nachos|snack|chips|cracker/i, emoji: "\uD83C\uDF5F" },
  { regex: /halo|flan|cake|dessert|ice cream|sweet|chocolate|candy/i, emoji: "\uD83C\uDF70" },
  { regex: /bread|bakery|pan de sal/i, emoji: "\uD83C\uDF5E" },
  { regex: /tuna|sardines|corned|canned/i, emoji: "\uD83E\uDD6B" },
];

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const isLoopbackHost = (value) => LOOPBACK_HOSTS.has(String(value || "").toLowerCase());

const isAndroidEmulator = () => {
  if (Platform.OS !== "android") {
    return false;
  }

  const constants = Platform.constants || {};
  const deviceSignature = [
    constants.Fingerprint,
    constants.Model,
    constants.Brand,
    constants.Manufacturer,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return [
    "generic",
    "sdk",
    "emulator",
    "simulator",
    "genymotion",
    "google_sdk",
    "sdk_gphone",
    "sdk_phone",
  ].some((token) => deviceSignature.includes(token));
};

const normalizeHost = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const withoutProtocol = value.replace(/^[a-z]+:\/\//i, "");
  const host = withoutProtocol.split(/[/?]/)[0]?.split(":")[0];
  if (!host) {
    return null;
  }

  if (Platform.OS === "android" && (host === "localhost" || host === "127.0.0.1")) {
    return "10.0.2.2";
  }

  return host;
};

const getExpoHost = () =>
  normalizeHost(Constants.expoConfig?.hostUri)
  || normalizeHost(Constants.expoGoConfig?.debuggerHost)
  || normalizeHost(Constants.linkingUri)
  || normalizeHost(Constants.experienceUrl);

const resolveNativeApiHost = () => {
  const expoHost = getExpoHost();

  if (expoHost && !isLoopbackHost(expoHost)) {
    return expoHost;
  }

  if (isAndroidEmulator()) {
    return "10.0.2.2";
  }

  return "localhost";
};

const normalizeConfiguredApiUrl = (value) => {
  const trimmedValue = trimTrailingSlash(value);

  if (Platform.OS === "web") {
    return trimmedValue;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    if (!isLoopbackHost(parsedUrl.hostname)) {
      return trimmedValue;
    }

    parsedUrl.hostname = resolveNativeApiHost();
    return trimTrailingSlash(parsedUrl.toString());
  } catch {
    return trimmedValue;
  }
};

const resolveApiBaseUrl = () => {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl) {
      return normalizeConfiguredApiUrl(envUrl);
    }

    return `http://${window.location.hostname}:5000/api`;
  }

  const expoHost = getExpoHost();

  if (expoHost) {
    return `http://${expoHost}:5000/api`;
  }

  const nativeEnvUrl = process.env.EXPO_PUBLIC_NATIVE_API_URL;
  if (nativeEnvUrl) {
    return normalizeConfiguredApiUrl(nativeEnvUrl);
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return normalizeConfiguredApiUrl(envUrl);
  }

  return Platform.OS === "android" ? "http://10.0.2.2:5000/api" : "http://localhost:5000/api";
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

const resolveAssetUrl = (value) => {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const origin = API_BASE_URL.replace(/\/api$/, "");
  return new URL(value, `${origin}/`).toString();
};

const toSlug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getCategoryIcon = (name) => CATEGORY_ICON_MAP[toSlug(name)] || "\uD83C\uDF7D\uFE0F";

const getProductEmoji = (name, categoryName) => {
  const source = `${name || ""} ${categoryName || ""}`;
  const match = PRODUCT_EMOJI_RULES.find((entry) => entry.regex.test(source));
  return match?.emoji || "\uD83C\uDF7D\uFE0F";
};

const createApiError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const MOBILE_CUSTOMER_ONLY_MESSAGE =
  "This phone app is for customer accounts only. Staff and admin should use the web dashboard.";

const parseResponse = async (response) => {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const request = async (path, { method = "GET", body, auth = false } = {}) => {
  const headers = { Accept: "application/json" };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const { token } = await getAuth();
    if (!token && auth !== "optional") {
      throw createApiError("Please sign in again.", 401);
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message = payload?.message || payload?.errors?.[0]?.msg || "Request failed";
    throw createApiError(message, response.status);
  }

  return payload;
};

const normalizeUser = (user) => ({
  id: String(user?.id || user?._id || ""),
  name: user?.name || "",
  email: user?.email || "",
  phone: user?.phone || "",
  address: user?.address || "",
  role: user?.role || "user",
});

const requireCustomerUser = (user) => {
  const normalizedUser = normalizeUser(user);

  if (normalizedUser.role !== "user") {
    throw createApiError(MOBILE_CUSTOMER_ONLY_MESSAGE, 403);
  }

  return normalizedUser;
};

const normalizeCategoryId = (category) => {
  if (!category) {
    return "";
  }

  if (typeof category === "object") {
    return String(category._id || category.id || toSlug(category.name));
  }

  return String(category);
};

const normalizeCategoryName = (category) => {
  if (!category) {
    return "Items";
  }

  if (typeof category === "object") {
    return category.name || "Items";
  }

  return String(category);
};

const mapProduct = (product) => {
  const categoryName = normalizeCategoryName(product.category);
  const categoryId = normalizeCategoryId(product.category);

  return {
    id: String(product._id || product.id),
    name: product.name,
    category: categoryId,
    categoryName,
    categoryIcon: getCategoryIcon(categoryName),
    price: Number(product.discountPrice ?? product.price ?? 0),
    originalPrice: Number(product.price ?? 0),
    desc: product.description?.trim() || `${categoryName} item`,
    emoji: getProductEmoji(product.name, categoryName),
    imageUrl: resolveAssetUrl(product.imageUrl),
    stockQuantity: Number(product.stockQuantity ?? 0),
  };
};

const mapOrder = (order) => ({
  ...order,
  id: String(order.id || order._id || ""),
  queueNumber: Number(order.queueNumber || 0),
  items: Array.isArray(order.items)
    ? order.items.map((item) => ({
        ...item,
        productId: String(item.productId || item.product || ""),
        imageUrl: resolveAssetUrl(item.imageUrl),
      }))
    : [],
});

const mapTableMonitor = (tableMonitor) => ({
  tracked: Boolean(tableMonitor?.tracked),
  isFree: typeof tableMonitor?.isFree === "boolean" ? tableMonitor.isFree : null,
  isFirstInLine: Boolean(tableMonitor?.isFirstInLine),
  queuePosition: Number.isFinite(Number(tableMonitor?.queuePosition)) ? Number(tableMonitor.queuePosition) : null,
  nextQueuePosition: Number.isFinite(Number(tableMonitor?.nextQueuePosition)) ? Number(tableMonitor.nextQueuePosition) : null,
  activeReservations: Number(tableMonitor?.activeReservations || 0),
  status: String(tableMonitor?.status || "unassigned"),
  message: String(tableMonitor?.message || ""),
});

const mapReservation = (reservation) => ({
  ...reservation,
  id: String(reservation.id || reservation.reference || ""),
  reference: reservation.reference || reservation.id || "",
  partySize: Number(reservation.partySize || 1),
  tableLabel: reservation.tableLabel || "",
  tableMonitor: mapTableMonitor(reservation.tableMonitor),
  items: Array.isArray(reservation.items)
    ? reservation.items.map((item) => ({
        ...item,
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
      }))
    : [],
});

export const getCurrentUser = async () => {
  const payload = await request("/auth/me", { auth: true });
  return requireCustomerUser(payload);
};

export const updateCurrentUser = async (updates) => {
  const payload = await request("/auth/me", {
    method: "PUT",
    auth: true,
    body: updates,
  });

  return requireCustomerUser(payload);
};

export const loginUser = async (email, password) => {
  const payload = await request("/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });

  return { ok: true, token: payload.token, user: requireCustomerUser(payload.user) };
};

export const loginWithGoogleUser = async (credential) => {
  const payload = await request("/auth/google", {
    method: "POST",
    body: { credential },
  });

  return { ok: true, token: payload.token, user: requireCustomerUser(payload.user) };
};

export const loginWithFacebookUser = async (accessToken) => {
  const payload = await request("/auth/facebook", {
    method: "POST",
    body: { accessToken },
  });

  return { ok: true, token: payload.token, user: requireCustomerUser(payload.user) };
};

export const requestRegistrationOtp = async (name, email, phone, password) => {
  const payload = await request("/auth/register/request-otp", {
    method: "POST",
    body: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
    },
  });

  return {
    ok: true,
    message: payload?.message || "Registration OTP sent to your email",
    expiresInMinutes: Number(payload?.expiresInMinutes || 10),
  };
};

export const registerUser = async (name, email, phone, password, otp) => {
  const payload = await request("/auth/register", {
    method: "POST",
    body: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      otp: String(otp || "").trim(),
    },
  });

  return { ok: true, token: payload.token, user: requireCustomerUser(payload.user) };
};

export const getStoreSettings = async () => {
  const payload = await request("/settings/public");
  return {
    ...payload,
    logoUrl: resolveAssetUrl(payload.logoUrl),
    paymentMethods: Array.isArray(payload.paymentMethods) && payload.paymentMethods.length
      ? payload.paymentMethods
      : ["cash"],
  };
};

export const getProducts = async () => {
  const payload = await request("/products");
  return payload
    .filter((product) => product.isActive !== false && !product.isArchived)
    .map(mapProduct);
};

export const getCategories = async () => {
  const payload = await request("/categories");
  const mapped = payload.map((category) => ({
    id: String(category._id || category.id || toSlug(category.name)),
    name: category.name,
    icon: getCategoryIcon(category.name),
  }));

  return mapped.length
    ? [{ id: "all", name: "All", icon: CATEGORY_ICON_MAP.all }, ...mapped]
    : fallbackCategories;
};

export const createOrder = async ({ items, customer, paymentMethod, notes }) => {
  const payload = await request("/orders", {
    method: "POST",
    auth: "optional",
    body: {
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.qty,
      })),
      customer,
      paymentMethod,
      notes: notes || "",
      ...(paymentMethod === "stripe"
        ? {
            successUrl: `${API_ORIGIN}/api/payments/stripe/return?status=success&source=mobile&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${API_ORIGIN}/api/payments/stripe/return?status=cancel&source=mobile`
          }
        : {}),
    },
  });

  return {
    ok: true,
    order: mapOrder(payload.order),
  };
};

export const getMyOrders = async () => {
  const payload = await request("/orders/mine", { auth: true });
  return payload.map(mapOrder);
};

export const getOrderById = async (orderId) => {
  const payload = await request(`/orders/${orderId}`, { auth: true });
  return mapOrder(payload);
};

export const getGuestTrackedOrder = async (orderNumber, accessToken) => {
  const payload = await request(`/orders/public/${orderNumber}?accessToken=${encodeURIComponent(accessToken)}`);
  return mapOrder(payload);
};

export const createReservation = async ({
  date,
  time,
  cart,
  notes,
  total,
  customer,
  partySize = 1,
  tableLabel = "",
}) => {
  const payload = await request("/reservations", {
    method: "POST",
    auth: true,
    body: {
      date: date.key || date,
      time,
      items: cart.map((item) => ({
        productId: item.id,
        qty: item.qty,
      })),
      customer,
      partySize,
      tableLabel,
      notes: notes || "",
      total,
    },
  });

  return {
    ok: true,
    id: payload.id,
    reservation: mapReservation(payload.reservation),
  };
};

export const getReservations = async () => {
  const payload = await request("/reservations", { auth: true });
  return Array.isArray(payload) ? payload.map(mapReservation) : [];
};

export const getReservationTableStatus = async (date, time, tableLabel) => {
  const trimmedTableLabel = String(tableLabel || "").trim();
  if (!trimmedTableLabel) {
    return mapTableMonitor();
  }

  const params = new URLSearchParams({
    date: String(date || ""),
    time: String(time || ""),
    tableLabel: trimmedTableLabel,
  });
  const payload = await request(`/reservations/table-status?${params.toString()}`, { auth: true });
  return mapTableMonitor(payload?.tableMonitor);
};
