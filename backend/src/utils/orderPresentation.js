const toPlainObject = (value) => (value?.toObject ? value.toObject() : value);

const getQueueNumber = (plain) => {
  const queueNumber = Number(plain.queueNumber || 0);

  if (queueNumber > 0) {
    return queueNumber;
  }

  const fallback = Number(String(plain.orderNumber || "").split("-").pop());
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
};

const toUserSummary = (user) => {
  if (!user) {
    return null;
  }

  const plain = toPlainObject(user);

  if (typeof plain === "string") {
    return { id: plain };
  }

  return {
    id: String(plain._id || plain.id || ""),
    name: plain.name || "",
    email: plain.email || "",
    role: plain.role || ""
  };
};

const toOrderItem = (item) => ({
  productId: String(item.product?._id || item.product || ""),
  name: item.name,
  sku: item.sku || "",
  imageUrl: item.imageUrl || "",
  quantity: Number(item.quantity || 0),
  price: Number(item.price || 0),
  subtotal: Number(item.subtotal || 0)
});

const toTimelineEntry = (entry) => ({
  status: entry.status,
  note: entry.note || "",
  actorName: entry.actorName || "",
  actorRole: entry.actorRole || "",
  actorUserId: entry.actorUser ? String(entry.actorUser?._id || entry.actorUser) : "",
  createdAt: entry.createdAt
});

export const serializeOrder = (order, { includeGuestAccessToken = false } = {}) => {
  const plain = toPlainObject(order);

  return {
    id: String(plain._id || plain.id || ""),
    orderNumber: plain.orderNumber,
    queueNumber: getQueueNumber(plain),
    status: plain.status,
    source: plain.source || "mobile",
    customerUser: toUserSummary(plain.customerUser),
    isGuest: !plain.customerUser,
    customer: {
      name: plain.customer?.name || "",
      email: plain.customer?.email || "",
      phone: plain.customer?.phone || "",
      address: plain.customer?.address || ""
    },
    items: Array.isArray(plain.items) ? plain.items.map(toOrderItem) : [],
    subtotal: Number(plain.subtotal || 0),
    taxRate: Number(plain.taxRate || 0),
    taxAmount: Number(plain.taxAmount || 0),
    total: Number(plain.total || 0),
    paymentMethod: plain.paymentMethod || "cash",
    paymentProvider: plain.paymentProvider || "manual",
    paymentStatus: plain.paymentStatus || "pending",
    paymentUrl: plain.paymentUrl || "",
    paymentPaidAt: plain.paymentPaidAt || null,
    notes: plain.notes || "",
    cancelReason: plain.cancelReason || "",
    saleId: plain.sale ? String(plain.sale?._id || plain.sale) : "",
    completedAt: plain.completedAt || null,
    cancelledAt: plain.cancelledAt || null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    timeline: Array.isArray(plain.timeline) ? plain.timeline.map(toTimelineEntry) : [],
    ...(includeGuestAccessToken && plain.guestAccessToken
      ? { guestAccessToken: plain.guestAccessToken }
      : {})
  };
};
