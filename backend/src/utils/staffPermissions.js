export const STAFF_PERMISSION_KEYS = [
  "dashboard",
  "orders",
  "customers",
  "reports",
  "archive",
  "settings"
];

export const DEFAULT_STAFF_PERMISSIONS = Object.freeze({
  dashboard: true,
  orders: true,
  customers: true,
  reports: false,
  archive: false,
  settings: false
});

const parseBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
};

export const normalizeStaffPermissions = (value = {}) => {
  const normalized = { ...DEFAULT_STAFF_PERMISSIONS };

  STAFF_PERMISSION_KEYS.forEach((key) => {
    const parsed = parseBoolean(value?.[key]);
    if (typeof parsed === "boolean") {
      normalized[key] = parsed;
    }
  });

  return normalized;
};

export const hasStaffPermission = (user, permissionKey) => {
  if (!permissionKey || user?.role !== "staff") {
    return true;
  }

  const permissions = normalizeStaffPermissions(user?.staffPermissions);
  return permissions[permissionKey] !== false;
};
