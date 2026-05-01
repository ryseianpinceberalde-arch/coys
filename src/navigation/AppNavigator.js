import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import OrderStatusAlerts from "../components/OrderStatusAlerts";
import C from "../constants/colors";
import { useCart } from "../context/CartContext";
import CartScreen from "../screens/CartScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import CustomerDetailsScreen from "../screens/CustomerDetailsScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import OrderDetailsScreen from "../screens/OrderDetailsScreen";
import OrdersScreen from "../screens/OrdersScreen";
import ProductDetailsScreen from "../screens/ProductDetailsScreen";
import ReservationScreen from "../screens/ReservationScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StatusScreen from "../screens/StatusScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const tabIcon = (emoji) =>
  function TabBarIcon({ color }) {
    return <Text style={{ fontSize: 18, color }}>{emoji}</Text>;
  };

const ordersTabIcon = (badgeCount, showBadge) =>
  function OrdersTabIcon({ color }) {
    return (
      <View style={s.ordersIconWrap}>
        <Ionicons name="receipt-outline" size={21} color={color} />
        {showBadge && badgeCount > 0 ? (
          <View style={s.ordersIconBadge}>
            <Text style={s.ordersIconBadgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
          </View>
        ) : null}
      </View>
    );
  };

function MainTabs({
  isGuest,
  onExitGuest,
  onLogout,
  onOrdersFocusChange,
  onOrdersViewed,
  onShowLogin,
  onShowRegister,
  onUserUpdate,
  orderNotificationCount,
  user,
}) {
  const { itemCount } = useCart();
  const showOrdersBadge = (user?.role === "admin" || user?.role === "staff") && orderNotificationCount > 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopColor: C.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "800" },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        options={{ title: "Home", tabBarIcon: tabIcon("\uD83C\uDFE0") }}
      >
        {(props) => <HomeScreen {...props} isGuest={isGuest} />}
      </Tab.Screen>

      <Tab.Screen
        name="CartTab"
        options={{
          title: "Cart",
          tabBarIcon: tabIcon("\uD83D\uDED2"),
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
        }}
        component={CartScreen}
      />

      <Tab.Screen
        name="OrdersTab"
        options={{
          title: "Orders",
          tabBarIcon: ordersTabIcon(orderNotificationCount, showOrdersBadge),
        }}
      >
        {(props) => (
          <OrdersScreen
            {...props}
            isGuest={isGuest}
            onFocusChange={onOrdersFocusChange}
            onViewed={onOrdersViewed}
            user={user}
          />
        )}
      </Tab.Screen>

      {!isGuest && (
        <Tab.Screen
          name="ReservationsTab"
          options={{ title: "Reservations", tabBarIcon: tabIcon("\uD83C\uDF7D\uFE0F") }}
        >
          {(props) => <StatusScreen {...props} />}
        </Tab.Screen>
      )}

      <Tab.Screen name="ProfileTab" options={{ title: "Profile", tabBarIcon: tabIcon("\uD83D\uDC64") }}>
        {(props) => (
          <ProfileScreen
            {...props}
            isGuest={isGuest}
            onExitGuest={onExitGuest}
            onLogout={onLogout}
            onShowLogin={onShowLogin}
            onShowRegister={onShowRegister}
            onUserUpdate={onUserUpdate}
            user={user}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator({
  authScreen,
  isGuest,
  onContinueGuest,
  onExitGuest,
  onLogin,
  onLogout,
  onOrderReadyNotice,
  onOrdersFocusChange,
  onOrdersViewed,
  onStaffOrderCreated,
  onShowLogin,
  onShowRegister,
  onUserUpdate,
  orderNotificationCount = 0,
  user,
}) {
  const showMainApp = Boolean(user || isGuest);

  return (
    <>
      {showMainApp ? (
        <OrderStatusAlerts
          user={user}
          onNewOrder={onStaffOrderCreated}
          onOrderReady={onOrderReadyNotice}
        />
      ) : null}
      <Stack.Navigator
        key={showMainApp ? "app" : "auth"}
        initialRouteName={showMainApp ? "MainTabs" : authScreen}
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: C.text,
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        {showMainApp ? (
          <>
            <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
              {(props) => (
                <MainTabs
                  {...props}
                  isGuest={isGuest}
                  onExitGuest={onExitGuest}
                  onLogout={onLogout}
                  onOrdersFocusChange={onOrdersFocusChange}
                  onOrdersViewed={onOrdersViewed}
                  onShowLogin={onShowLogin}
                  onShowRegister={onShowRegister}
                  onUserUpdate={onUserUpdate}
                  orderNotificationCount={orderNotificationCount}
                  user={user}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: "Product Details" }} />
            <Stack.Screen name="Checkout" options={{ title: "Checkout" }}>
              {(props) => <CheckoutScreen {...props} user={user} isGuest={isGuest} />}
            </Stack.Screen>
            <Stack.Screen name="OrderDetails" options={{ title: "Order Tracking" }}>
              {(props) => <OrderDetailsScreen {...props} user={user} />}
            </Stack.Screen>
            <Stack.Screen name="Reservation" options={{ title: "Reservation" }}>
              {(props) => <ReservationScreen {...props} />}
            </Stack.Screen>
            <Stack.Screen name="CustomerDetails" options={{ title: "Reservation Details" }}>
              {(props) => <CustomerDetailsScreen {...props} user={user} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {(props) => <LoginScreen {...props} onContinueGuest={onContinueGuest} onLogin={onLogin} />}
            </Stack.Screen>
            <Stack.Screen name="Register" options={{ title: "Create Account" }}>
              {(props) => <RegisterScreen {...props} onLogin={onLogin} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </>
  );
}

const s = StyleSheet.create({
  ordersIconWrap: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ordersIconBadge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: "#DC2626",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ordersIconBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
});
