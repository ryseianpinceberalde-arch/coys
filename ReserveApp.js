import React, { useEffect, useState } from "react";
import {
  NavigationContainer,
  NavigationIndependentTree,
} from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from "./src/screens/SplashScreen";
import { CartProvider } from "./src/context/CartContext";
import { getCurrentUser } from "./src/services/api";
import {
  clearAuth,
  getAuth,
  getOrderAlertsState,
  saveOrderAlertsState,
} from "./src/services/storage";
import {
  initializeDeviceNotifications,
  setDeviceNotificationBadgeCount,
} from "./src/services/deviceNotifications";

const isCustomerUser = (nextUser) => !nextUser || nextUser.role === "user";
const isStaffUser = (nextUser) => nextUser?.role === "admin" || nextUser?.role === "staff";

export default function ReserveApp() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authScreen, setAuthScreen] = useState("Login");
  const [orderNotificationCount, setOrderNotificationCount] = useState(0);
  const [orderReadyNotice, setOrderReadyNotice] = useState("");
  const [ordersScreenFocused, setOrdersScreenFocused] = useState(false);
  const [restored, setRestored] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const navigationKey = user || isGuest ? "app" : "auth";

  useEffect(() => {
    let active = true;

    getOrderAlertsState()
      .then((storedState) => {
        if (active) {
          setOrderNotificationCount(storedState.unreadCount || 0);
        }
      })
      .catch(() => {});

    initializeDeviceNotifications().catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const auth = await getAuth();
      if (!active) {
        return;
      }

      if (!auth.token || !isCustomerUser(auth.user)) {
        if (auth.token && !isCustomerUser(auth.user)) {
          await clearAuth();
        }

        setUser(null);
        setIsGuest(false);
        setRestored(true);
        return;
      }

      // Restore the cached session first so app launch does not wait on /auth/me.
      setUser(auth.user || null);
      setIsGuest(false);
      setRestored(true);

      try {
        const currentUser = await getCurrentUser();
        if (active) {
          setUser(currentUser);
        }
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          await clearAuth();
        }

        if (active && (error?.status === 401 || error?.status === 403)) {
          setUser(null);
        }
      }
    };

    restoreSession().catch(() => {
      if (active) {
        setUser(null);
        setIsGuest(false);
        setRestored(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveOrderAlertsState({ unreadCount: orderNotificationCount }).catch(() => {});
    setDeviceNotificationBadgeCount(orderNotificationCount).catch(() => {});
  }, [orderNotificationCount]);

  useEffect(() => {
    if (!orderReadyNotice) {
      return undefined;
    }

    const timeout = setTimeout(() => setOrderReadyNotice(""), 3200);
    return () => clearTimeout(timeout);
  }, [orderReadyNotice]);

  useEffect(() => {
    if (!restored) {
      return;
    }

    if (isStaffUser(user)) {
      return;
    }

    setOrderNotificationCount(0);
  }, [restored, user]);

  const handleLogin = (nextUser) => {
    setUser(nextUser);
    setIsGuest(false);
    setAuthScreen("Login");
  };

  const handleGuest = () => {
    setUser(null);
    setIsGuest(true);
    setAuthScreen("Login");
    setOrderNotificationCount(0);
  };

  const handleExitGuest = () => {
    setIsGuest(false);
    setAuthScreen("Login");
    setOrderNotificationCount(0);
  };

  const handleShowLogin = () => {
    setUser(null);
    setIsGuest(false);
    setAuthScreen("Login");
    setOrderNotificationCount(0);
  };

  const handleShowRegister = () => {
    setUser(null);
    setIsGuest(false);
    setAuthScreen("Register");
    setOrderNotificationCount(0);
  };

  const handleLogout = async () => {
    await clearAuth();
    setUser(null);
    setIsGuest(false);
    setAuthScreen("Login");
    setOrderNotificationCount(0);
    setOrdersScreenFocused(false);
  };

  const handleStaffOrderCreated = () => {
    if (!isStaffUser(user) || ordersScreenFocused) {
      return;
    }

    setOrderNotificationCount((current) => current + 1);
  };

  const handleOrdersViewed = () => {
    setOrderNotificationCount(0);
  };

  const handleOrdersFocusChange = (isFocused) => {
    setOrdersScreenFocused(isFocused);
    if (isFocused) {
      setOrderNotificationCount(0);
    }
  };

  const handleOrderReadyNotice = (message) => {
    setOrderReadyNotice(message || "Order is ready!");
  };

  if (showSplash || !restored) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </>
    );
  }

  return (
    <NavigationIndependentTree>
      <NavigationContainer key={navigationKey}>
        <CartProvider>
          <StatusBar style="dark" />
          <AppNavigator
            authScreen={authScreen}
            isGuest={isGuest}
            onContinueGuest={handleGuest}
            onExitGuest={handleExitGuest}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onOrderReadyNotice={handleOrderReadyNotice}
            onOrdersFocusChange={handleOrdersFocusChange}
            onOrdersViewed={handleOrdersViewed}
            onStaffOrderCreated={handleStaffOrderCreated}
            onShowLogin={handleShowLogin}
            onShowRegister={handleShowRegister}
            onUserUpdate={setUser}
            orderNotificationCount={orderNotificationCount}
            user={user}
          />
          {orderReadyNotice ? (
            <View pointerEvents="none" style={s.noticeWrap}>
              <View style={s.noticeCard}>
                <Text style={s.noticeTitle}>Live Order Alert</Text>
                <Text style={s.noticeText}>{orderReadyNotice}</Text>
              </View>
            </View>
          ) : null}
        </CartProvider>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}

const s = StyleSheet.create({
  noticeWrap: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  noticeCard: {
    backgroundColor: "#0F172A",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  noticeTitle: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  noticeText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
});
