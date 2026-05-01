export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled"
];

export const ORDER_STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled"
};

const ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export const canTransitionOrderStatus = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) {
    return false;
  }

  if (fromStatus === toStatus) {
    return true;
  }

  return ORDER_TRANSITIONS[fromStatus]?.includes(toStatus) || false;
};

export const getNextOrderStatuses = (status) => ORDER_TRANSITIONS[status] || [];
