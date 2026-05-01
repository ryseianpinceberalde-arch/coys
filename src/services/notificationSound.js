import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";
import { showDeviceOrderNotification } from "./deviceNotifications";

let soundPromise = null;
let audioModeKey = "";
let readyAlertSoundTimeout = null;
let readyAlertVibrationTimeout = null;
const recentNotifications = new Map();
const RECENT_NOTIFICATION_TTL_MS = 5000;
const READY_ALERT_SOUND_WINDOW_MS = 8000;
const READY_ALERT_VIBRATION_WINDOW_MS = 8000;

const NOTIFICATION_VIBRATION_PATTERNS = {
  "new-order": [0, 420, 180, 420, 180, 760],
  ready: [0, 500, 220, 500, 220, 800],
  completed: [0, 320, 160, 320],
};

const NOTIFICATION_HAPTICS = {
  "new-order": Haptics.NotificationFeedbackType.Warning,
  ready: Haptics.NotificationFeedbackType.Success,
  completed: Haptics.NotificationFeedbackType.Success,
};

const getOrderIdentity = (orderOrKey) => {
  if (typeof orderOrKey === "string" || typeof orderOrKey === "number") {
    return String(orderOrKey).trim();
  }

  return String(orderOrKey?.id || orderOrKey?._id || orderOrKey?.orderNumber || "").trim();
};

const getOrderNumber = (orderOrKey) => {
  if (typeof orderOrKey === "object" && orderOrKey) {
    return String(orderOrKey.orderNumber || orderOrKey.id || orderOrKey._id || "").trim();
  }

  return getOrderIdentity(orderOrKey);
};

const clearReadyAlertSoundTimer = () => {
  if (readyAlertSoundTimeout) {
    clearTimeout(readyAlertSoundTimeout);
    readyAlertSoundTimeout = null;
  }
};

const clearReadyAlertVibrationTimer = () => {
  if (readyAlertVibrationTimeout) {
    clearTimeout(readyAlertVibrationTimeout);
    readyAlertVibrationTimeout = null;
  }
};

const configureAudioMode = async (type = "default") => {
  const normalizedType = String(type || "").toLowerCase();
  const nextModeKey = normalizedType === "ready" ? "alarm" : "default";

  if (audioModeKey === nextModeKey) {
    return;
  }

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    interruptionModeIOS: nextModeKey === "alarm"
      ? InterruptionModeIOS.DoNotMix
      : InterruptionModeIOS.MixWithOthers,
    interruptionModeAndroid: nextModeKey === "alarm"
      ? InterruptionModeAndroid.DoNotMix
      : InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: nextModeKey !== "alarm",
  });

  audioModeKey = nextModeKey;
};

const loadSound = async (type = "default") => {
  await configureAudioMode(type);

  if (!soundPromise) {
    soundPromise = Audio.Sound.createAsync(
      require("../../assets/sounds/notification.wav"),
      { shouldPlay: false },
    );
  }

  return soundPromise;
};

const pruneRecentNotifications = (now) => {
  recentNotifications.forEach((timestamp, key) => {
    if (now - timestamp > RECENT_NOTIFICATION_TTL_MS) {
      recentNotifications.delete(key);
    }
  });
};

const shouldSkipRecentNotification = (type, orderOrKey) => {
  const normalizedType = String(type || "").toLowerCase();
  const normalizedOrderKey = getOrderIdentity(orderOrKey);
  if (!normalizedOrderKey) {
    return false;
  }

  const now = Date.now();
  pruneRecentNotifications(now);
  const key = `${normalizedOrderKey}:${normalizedType}`;
  const previousTimestamp = recentNotifications.get(key);

  if (previousTimestamp && now - previousTimestamp <= RECENT_NOTIFICATION_TTL_MS) {
    return true;
  }

  recentNotifications.set(key, now);
  return false;
};

const buildOrderNotificationTitle = (type) => {
  if (type === "new-order") {
    return "New order received";
  }

  if (type === "ready") {
    return "Order is ready!";
  }

  return "Order update";
};

const buildOrderNotificationBody = (type, orderOrKey) => {
  const orderNumber = getOrderNumber(orderOrKey);

  if (type === "new-order") {
    const customerName = String(orderOrKey?.customer?.name || "").trim();
    return orderNumber && customerName
      ? `${orderNumber} from ${customerName}`
      : orderNumber || "A new customer order just arrived.";
  }

  if (type === "ready") {
    return orderNumber ? `${orderNumber} is ready for pickup.` : "Your order is ready for pickup.";
  }

  if (type === "completed") {
    return orderNumber ? `${orderNumber} is complete.` : "Your order is complete.";
  }

  return orderNumber ? `${orderNumber} has a new update.` : "There is a new order update.";
};

export const playNotificationSound = async (type = "default") => {
  try {
    const normalizedType = String(type || "").toLowerCase();
    const { sound } = await loadSound(normalizedType);
    clearReadyAlertSoundTimer();
    await sound.stopAsync().catch(() => {});

    if (normalizedType === "ready") {
      await sound.setPositionAsync(0);
      await sound.setIsLoopingAsync(true).catch(() => {});
      await sound.playAsync();
      readyAlertSoundTimeout = setTimeout(() => {
        sound.setIsLoopingAsync(false).catch(() => {});
        sound.stopAsync().catch(() => {});
        readyAlertSoundTimeout = null;
      }, READY_ALERT_SOUND_WINDOW_MS);
      return;
    }

    await sound.setIsLoopingAsync(false).catch(() => {});
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Notification sound should never block the primary flow.
  }
};

export const shouldNotifyOrderStatus = (status) => {
  const normalizedStatus = String(status || "").toLowerCase();
  return normalizedStatus === "ready" || normalizedStatus === "completed";
};

export const triggerVibration = async (type = "ready") => {
  try {
    const normalizedType = String(type || "").toLowerCase();
    const hapticType = NOTIFICATION_HAPTICS[normalizedType];
    const pattern = NOTIFICATION_VIBRATION_PATTERNS[normalizedType];
    clearReadyAlertVibrationTimer();
    Vibration.cancel();

    if (Platform.OS === "android" && normalizedType === "new-order") {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press);
    } else if (Platform.OS === "android" && normalizedType === "ready") {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
    } else if (Platform.OS === "android" && normalizedType === "completed") {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End);
    } else if (hapticType) {
      await Haptics.notificationAsync(hapticType);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (Platform.OS === "android" && normalizedType === "ready" && pattern) {
      Vibration.vibrate(pattern, true);
      readyAlertVibrationTimeout = setTimeout(() => {
        Vibration.cancel();
        readyAlertVibrationTimeout = null;
      }, READY_ALERT_VIBRATION_WINDOW_MS);
      return;
    }

    if (Platform.OS === "android" && pattern) {
      Vibration.vibrate(pattern);
      return;
    }

    if (normalizedType === "ready") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      Vibration.vibrate([0, 700, 240, 700]);
      return;
    }

    if (normalizedType === "new-order") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      Vibration.vibrate(550);
      return;
    }

    Vibration.vibrate();
  } catch {
    // Vibration should never block the primary flow.
  }
};

export const vibrateNotification = triggerVibration;

const notifyWithFeedback = async (type, orderOrKey, { onInAppAlert } = {}) => {
  if (shouldSkipRecentNotification(type, orderOrKey)) {
    return;
  }

  const title = buildOrderNotificationTitle(type);
  const body = buildOrderNotificationBody(type, orderOrKey);

  if (type === "ready") {
    onInAppAlert?.("Order is ready!");
  }

  await Promise.all([
    triggerVibration(type),
    playNotificationSound(type),
    showDeviceOrderNotification({
      title,
      body,
      data: {
        type,
        orderNumber: getOrderNumber(orderOrKey),
      },
    }),
  ]);
};

export const notifyNewOrder = async (order, options = {}) => {
  await notifyWithFeedback("new-order", order, options);
};

export const notifyOrderReady = async (order, options = {}) => {
  await notifyWithFeedback("ready", order, options);
};

const notifyOrderCompleted = async (orderOrKey, options = {}) => {
  await notifyWithFeedback("completed", orderOrKey, options);
};

export const notifyOrderStatus = async (status, orderOrKey, order = null, options = {}) => {
  const normalizedStatus = String(status || "").toLowerCase();
  const target = order || orderOrKey;

  if (normalizedStatus === "ready") {
    await notifyOrderReady(target, options);
    return;
  }

  if (normalizedStatus === "completed") {
    await notifyOrderCompleted(target, options);
  }
};
