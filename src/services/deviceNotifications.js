import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";

const ORDER_ALERTS_CHANNEL_ID = "order-alerts-v2";

let notificationsInitialized = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const requestNotificationPermissions = async () => {
  try {
    const currentSettings = await Notifications.getPermissionsAsync();
    if (currentSettings.granted) {
      return currentSettings;
    }

    return Notifications.requestPermissionsAsync();
  } catch {
    return null;
  }
};

export const initializeDeviceNotifications = async () => {
  if (notificationsInitialized) {
    return;
  }

  notificationsInitialized = true;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ORDER_ALERTS_CHANNEL_ID, {
      name: "Order alerts",
      description: "Sound, vibration, and badge alerts for order updates",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 500, 220, 500, 220, 800],
      enableVibrate: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch(() => {});
  }

  await requestNotificationPermissions();
};

export const showDeviceOrderNotification = async ({ title, body, data = {} }) => {
  if (AppState.currentState === "active") {
    return;
  }

  const isReadyAlert = String(data?.type || "").toLowerCase() === "ready";

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: "default",
      vibrate: isReadyAlert ? [0, 500, 220, 500, 220, 800] : [0, 320, 160, 320],
      priority: Notifications.AndroidNotificationPriority.MAX,
      interruptionLevel: isReadyAlert ? "timeSensitive" : "active",
    },
    trigger: Platform.OS === "android" ? { channelId: ORDER_ALERTS_CHANNEL_ID } : null,
  }).catch(() => {});
};

export const setDeviceNotificationBadgeCount = async (count) => {
  const normalizedCount = Math.max(0, Number(count || 0));
  await Notifications.setBadgeCountAsync(normalizedCount).catch(() => {});
};
