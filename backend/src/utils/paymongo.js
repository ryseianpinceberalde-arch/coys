const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";
const APP_PAYMONGO_PAYMENT_METHODS = new Set(["gcash", "qrph", "card"]);
const VALID_PAYMONGO_CHECKOUT_METHODS = new Set([
  "billease",
  "brankas_bdo",
  "brankas_landbank",
  "brankas_metrobank",
  "card",
  "dob",
  "gcash",
  "grab_pay",
  "paymaya",
  "qrph",
  "shopeepay"
]);
const PAYMONGO_METHOD_ALIASES = new Map([
  ["bill_ease", "billease"],
  ["bill-ease", "billease"],
  ["brankas", "dob"],
  ["credit_card", "card"],
  ["debit_card", "card"],
  ["direct_online_banking", "dob"],
  ["grabpay", "grab_pay"],
  ["maya", "paymaya"],
  ["pay_maya", "paymaya"],
  ["pay-maya", "paymaya"],
  ["qr_ph", "qrph"],
  ["qr-ph", "qrph"],
  ["shopee_pay", "shopeepay"],
  ["shopee-pay", "shopeepay"]
]);
const PAYMONGO_NO_METHODS_MESSAGE =
  "No PayMongo payment methods are enabled for this account or session.";
const DEFAULT_PAYMONGO_MERCHANT_NAME = "Coy's Corner";
const PLACEHOLDER_STORE_NAMES = new Set(["my store"]);

const readPayload = async (response) => {
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

const unwrapPayMongoPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Object.hasOwn(payload, "data")) {
    return payload.data ?? null;
  }

  return payload ?? null;
};

const createBasicAuthHeader = (secretKey) =>
  `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

const stringifyForLog = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const logPayMongo = (level, label, value) => {
  const logger = typeof console[level] === "function" ? console[level] : console.log;

  if (value === undefined) {
    logger(`[PayMongo] ${label}`);
    return;
  }

  logger(`[PayMongo] ${label}: ${stringifyForLog(value)}`);
};

const getPayMongoSecretKey = () => String(process.env.PAYMONGO_SECRET_KEY || "").trim();

export const getPayMongoEnvironmentMode = () => {
  const secretKey = getPayMongoSecretKey();

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  return "unknown";
};

const normalizePayMongoMethod = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  const collapsed = normalized.replace(/[\s-]+/g, "_");
  const aliased = PAYMONGO_METHOD_ALIASES.get(collapsed) || collapsed;

  return VALID_PAYMONGO_CHECKOUT_METHODS.has(aliased) ? aliased : "";
};

const parsePayMongoPaymentMethods = (value) =>
  [...new Set(
    String(value || "")
      .split(",")
      .map((entry) => normalizePayMongoMethod(entry))
      .filter(Boolean)
  )];

const getPayMongoConfiguredMethodsValue = () => {
  const mode = getPayMongoEnvironmentMode();
  const testOverride = process.env.PAYMONGO_TEST_PAYMENT_METHODS;
  const liveOverride = process.env.PAYMONGO_LIVE_PAYMENT_METHODS;

  if (mode === "test" && testOverride !== undefined) {
    return testOverride;
  }

  if (mode === "live" && liveOverride !== undefined) {
    return liveOverride;
  }

  return process.env.PAYMONGO_PAYMENT_METHODS || "";
};

export const getConfiguredPayMongoPaymentMethods = ({ appVisibleOnly = false } = {}) => {
  const configured = parsePayMongoPaymentMethods(getPayMongoConfiguredMethodsValue());

  if (!appVisibleOnly) {
    return configured;
  }

  return configured.filter((method) => APP_PAYMONGO_PAYMENT_METHODS.has(method));
};

const filterAppVisiblePayMongoMethods = (methods) =>
  methods.filter((method) => APP_PAYMONGO_PAYMENT_METHODS.has(method));

const collectKnownPayMongoMethods = (value, results = new Set()) => {
  if (typeof value === "string") {
    const normalized = normalizePayMongoMethod(value);
    if (normalized) {
      results.add(normalized);
    }
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectKnownPayMongoMethods(entry, results));
    return results;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectKnownPayMongoMethods(entry, results));
  }

  return results;
};

const normalizePhoneForPayMongo = (phone) => {
  const digits = String(phone || "").replace(/[^\d+]/g, "");

  if (/^09\d{9}$/.test(digits)) {
    return `+63${digits.slice(1)}`;
  }

  if (/^\+639\d{9}$/.test(digits)) {
    return digits;
  }

  return "";
};

const normalizePayMongoError = (payload, fallbackMessage) => {
  if (payload?.errors?.length) {
    return payload.errors
      .map((entry) => entry.detail || entry.title || entry.code)
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  return fallbackMessage;
};

const isPayMongoNoMethodsError = (payload) => {
  const normalizedMessage = normalizePayMongoError(payload, "").toLowerCase();
  return /no payment methods? are available|payment_method_types|payment methods? enabled/.test(normalizedMessage);
};

const paymongoRequest = async (path, { method = "GET", body } = {}) => {
  const secretKey = getPayMongoSecretKey();

  if (!secretKey) {
    throw new Error("PayMongo is not configured. Set PAYMONGO_SECRET_KEY in the backend environment.");
  }

  const response = await fetch(`${PAYMONGO_API_BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: createBasicAuthHeader(secretKey),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    logPayMongo("error", "Error response body", {
      path,
      status: response.status,
      body: payload
    });
    throw new Error(
      isPayMongoNoMethodsError(payload)
        ? PAYMONGO_NO_METHODS_MESSAGE
        : normalizePayMongoError(payload, "Unable to communicate with PayMongo.")
    );
  }

  return unwrapPayMongoPayload(payload);
};

const toCentavos = (amount) => Math.round(Number(amount || 0) * 100);

const buildLineItems = (order) => {
  const lineItems = order.items.map((item) => ({
    currency: "PHP",
    amount: toCentavos(item.price),
    name: item.name,
    quantity: Number(item.quantity || 0),
    description: item.sku ? `SKU: ${item.sku}` : undefined
  }));

  const totalCents = toCentavos(order.total);
  const currentCents = lineItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
  const adjustmentCents = totalCents - currentCents;

  if (adjustmentCents > 0) {
    lineItems.push({
      currency: "PHP",
      amount: adjustmentCents,
      name: order.taxAmount > 0 ? `Tax (${Number(order.taxRate || 0)}%)` : "Order Adjustment",
      quantity: 1,
      description: order.taxAmount > 0 ? "Included tax for this order" : "Rounding adjustment"
    });
  }

  return lineItems;
};

const getCheckoutPaymentType = (paymentMethod) => {
  const normalized = normalizePayMongoMethod(paymentMethod);

  if (!normalized || !APP_PAYMONGO_PAYMENT_METHODS.has(normalized)) {
    throw new Error("Selected payment method does not require an online checkout session.");
  }

  return normalized;
};

const normalizeMerchantName = (value) => {
  const trimmed = String(value || "").trim();

  if (!trimmed || PLACEHOLDER_STORE_NAMES.has(trimmed.toLowerCase())) {
    return DEFAULT_PAYMONGO_MERCHANT_NAME;
  }

  return trimmed;
};

export const getMerchantEnabledPayMongoMethods = async ({ appVisibleOnly = false } = {}) => {
  const capabilities = await paymongoRequest("/merchants/capabilities/payment_methods");
  const enabledMethods = [...collectKnownPayMongoMethods(capabilities)];

  if (!appVisibleOnly) {
    return enabledMethods;
  }

  return filterAppVisiblePayMongoMethods(enabledMethods);
};

const getPaidAtDate = (payment) => {
  const paidAt = payment?.attributes?.paid_at ?? payment?.paid_at;

  if (!paidAt) {
    return new Date();
  }

  return new Date(Number(paidAt) * 1000);
};

export const isOnlinePaymentMethod = (paymentMethod) =>
  APP_PAYMONGO_PAYMENT_METHODS.has(String(paymentMethod || "").toLowerCase());

export const isPayMongoConfigured = () =>
  Boolean(getPayMongoSecretKey());

export const createCheckoutSession = async ({ customer, notes, order, merchantName = "" }) => {
  const paymentMethodType = getCheckoutPaymentType(order.paymentMethod);
  const environmentMode = getPayMongoEnvironmentMode();
  const configuredMethods = getConfiguredPayMongoPaymentMethods();
  const enabledMethods = await getMerchantEnabledPayMongoMethods();
  const paymentMethodTypes = configuredMethods.filter((method) =>
    enabledMethods.includes(method) && method === paymentMethodType
  );
  const displayMerchantName = normalizeMerchantName(merchantName);

  if (!paymentMethodTypes.length) {
    logPayMongo("error", "Checkout blocked because payment_method_types is empty", {
      environmentMode,
      requestedPaymentMethod: paymentMethodType,
      configuredMethods,
      enabledMethods
    });
    throw new Error(PAYMONGO_NO_METHODS_MESSAGE);
  }

  const checkoutPayload = {
    data: {
      attributes: {
        billing: {
          name: customer.name,
          email: customer.email,
          phone: normalizePhoneForPayMongo(customer.phone) || undefined
        },
        description: `Payment to ${displayMerchantName} for order ${order.orderNumber}`,
        line_items: buildLineItems(order),
        metadata: {
          orderNumber: order.orderNumber,
          paymentMethod: order.paymentMethod,
          customerName: customer.name,
          customerEmail: customer.email,
          merchantName: displayMerchantName,
          notes: notes || ""
        },
        payment_method_types: paymentMethodTypes,
        reference_number: order.orderNumber,
        send_email_receipt: true,
        show_description: true,
        show_line_items: true
      }
    }
  };

  logPayMongo("info", "Environment mode", environmentMode);
  logPayMongo("info", "payment_method_types", paymentMethodTypes);
  logPayMongo("info", "Checkout payload", checkoutPayload);

  const session = await paymongoRequest("/checkout_sessions", {
    method: "POST",
    body: checkoutPayload
  });

  return {
    id: session?.id || "",
    checkoutUrl: session?.attributes?.checkout_url || ""
  };
};

export const retrieveCheckoutSession = async (sessionId) => {
  if (!sessionId) {
    throw new Error("Checkout session id is required.");
  }

  return paymongoRequest(`/checkout_sessions/${sessionId}`);
};

export const getCheckoutPaymentSnapshot = (checkoutSession) => {
  const attributes = checkoutSession?.attributes || {};
  const directPayments = Array.isArray(attributes.payments) ? attributes.payments : [];
  const intentPayments = Array.isArray(attributes.payment_intent?.attributes?.payments)
    ? attributes.payment_intent.attributes.payments
    : [];
  const payments = [...directPayments, ...intentPayments];
  const paidPayment = payments.find((payment) => {
    const status = String(payment?.attributes?.status || payment?.status || "").toLowerCase();
    return status === "paid";
  });

  if (paidPayment) {
    return {
      paymentStatus: "paid",
      paymentPaidAt: getPaidAtDate(paidPayment)
    };
  }

  const intentStatus = String(
    attributes.payment_intent?.attributes?.status
      || attributes.payment_intent?.status
      || ""
  ).toLowerCase();

  if (intentStatus === "succeeded") {
    return {
      paymentStatus: "paid",
      paymentPaidAt: new Date()
    };
  }

  return {
    paymentStatus: "pending",
    paymentPaidAt: null
  };
};
