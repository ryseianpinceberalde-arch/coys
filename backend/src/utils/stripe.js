const STRIPE_API_BASE = "https://api.stripe.com/v1";

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

const normalizeStripeError = (payload, fallbackMessage) => {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  return fallbackMessage;
};

const stripeRequest = async (path, { method = "GET", body } = {}) => {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();

  if (!secretKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in the backend environment.");
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body
  });

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(normalizeStripeError(payload, "Unable to communicate with Stripe."));
  }

  return payload;
};

const toCents = (amount) => Math.round(Number(amount || 0) * 100);

const appendMetadata = (params, metadata = {}) => {
  Object.entries(metadata).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    params.append(`metadata[${key}]`, String(value));
  });
};

const appendLineItems = (params, lineItems = []) => {
  lineItems.forEach((item, index) => {
    params.append(`line_items[${index}][quantity]`, String(item.quantity || 1));
    params.append(`line_items[${index}][price_data][currency]`, String(item.currency || "php").toLowerCase());
    params.append(`line_items[${index}][price_data][unit_amount]`, String(toCents(item.amount)));
    params.append(`line_items[${index}][price_data][product_data][name]`, item.name);

    if (item.description) {
      params.append(`line_items[${index}][price_data][product_data][description]`, item.description);
    }
  });
};

const normalizeSessionStatus = (session) => {
  const paymentStatus = String(session?.payment_status || "").toLowerCase();
  const sessionStatus = String(session?.status || "").toLowerCase();

  if (paymentStatus === "paid") {
    return "paid";
  }

  if (sessionStatus === "expired") {
    return "expired";
  }

  return "pending";
};

export const isStripeConfigured = () =>
  Boolean(String(process.env.STRIPE_SECRET_KEY || "").trim());

export const createStripeCheckoutSession = async ({
  customerEmail = "",
  successUrl,
  cancelUrl,
  clientReferenceId = "",
  lineItems = [],
  metadata = {}
}) => {
  if (!successUrl || !cancelUrl) {
    throw new Error("Stripe checkout requires success and cancel URLs.");
  }

  if (!lineItems.length) {
    throw new Error("Stripe checkout requires at least one line item.");
  }

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", successUrl);
  params.append("cancel_url", cancelUrl);
  params.append("payment_method_types[0]", "card");
  params.append("billing_address_collection", "auto");

  if (customerEmail) {
    params.append("customer_email", customerEmail);
  }

  if (clientReferenceId) {
    params.append("client_reference_id", clientReferenceId);
  }

  appendLineItems(params, lineItems);
  appendMetadata(params, metadata);

  const session = await stripeRequest("/checkout/sessions", {
    method: "POST",
    body: params.toString()
  });

  return {
    id: session.id,
    checkoutUrl: session.url || "",
    paymentStatus: normalizeSessionStatus(session)
  };
};

export const retrieveStripeCheckoutSession = async (sessionId) => {
  if (!sessionId) {
    throw new Error("Stripe checkout session id is required.");
  }

  return stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
};

export const getStripeCheckoutSnapshot = (session) => ({
  paymentStatus: normalizeSessionStatus(session),
  checkoutUrl: session?.url || "",
  paymentPaidAt: normalizeSessionStatus(session) === "paid" ? new Date() : null
});
