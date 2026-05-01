import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import C from "../constants/colors";
import Btn from "../components/Btn";
import { useCart } from "../context/CartContext";
import { fmt } from "../utils/helpers";

export default function CartScreen({ navigation }) {
  const { items, itemCount, subtotal, updateQty, removeItem, clearCart } = useCart();

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={s.title}>Your Cart</Text>
          <Text style={s.sub}>{itemCount} item{itemCount === 1 ? "" : "s"} ready for checkout</Text>
        </View>

        {!items.length ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>{"\uD83D\uDED2"}</Text>
            <Text style={s.emptyTitle}>Your cart is empty</Text>
            <Text style={s.emptySub}>Add products from the home screen to start an order.</Text>
            <Btn title="Browse Products" onPress={() => navigation.navigate("HomeTab")} style={{ marginTop: 18 }} />
          </View>
        ) : (
          <>
            {items.map((item) => (
              <View key={item.id} style={s.itemCard}>
                <View style={s.itemTop}>
                  <View style={s.itemEmojiWrap}>
                    <Text style={s.itemEmoji}>{item.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemMeta}>{item.categoryName}</Text>
                    <Text style={s.itemPrice}>{fmt(item.price)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.id)} activeOpacity={0.7}>
                    <Text style={s.remove}>Remove</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.itemFooter}>
                  <View style={s.qtyRow}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.id, item.qty - 1)} activeOpacity={0.8}>
                      <Text style={s.qtyTxt}>{"\u2212"}</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyValue}>{item.qty}</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.id, item.qty + 1)} activeOpacity={0.8}>
                      <Text style={s.qtyTxt}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={s.lineTotal}>{fmt(item.qty * item.price)}</Text>
                </View>
              </View>
            ))}

            <View style={s.summaryCard}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Subtotal</Text>
                <Text style={s.summaryValue}>{fmt(subtotal)}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Tax</Text>
                <Text style={s.summaryHint}>Calculated at checkout</Text>
              </View>
              <View style={[s.summaryRow, s.totalRow]}>
                <Text style={s.totalLabel}>Estimated Total</Text>
                <Text style={s.totalValue}>{fmt(subtotal)}</Text>
              </View>

              <Btn
                title="Proceed to Checkout"
                onPress={() => {
                  const parent = navigation.getParent();
                  if (parent) {
                    parent.navigate("Checkout");
                    return;
                  }
                  navigation.navigate("Checkout");
                }}
                style={{ marginTop: 16 }}
              />
              <Btn title="Clear Cart" onPress={clearCart} variant="outline" style={{ marginTop: 10 }} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 32 },
  header: { marginBottom: 18 },
  title: { fontSize: 28, fontWeight: "900", color: C.text, letterSpacing: -0.6 },
  sub: { fontSize: 14, color: C.textSec, marginTop: 8 },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: C.text },
  emptySub: { fontSize: 13, color: C.textSec, textAlign: "center", marginTop: 8, lineHeight: 20 },
  itemCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
  },
  itemTop: { flexDirection: "row", gap: 12 },
  itemEmojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  itemEmoji: { fontSize: 24 },
  itemName: { fontSize: 16, fontWeight: "800", color: C.text },
  itemMeta: { fontSize: 12, color: C.textSec, marginTop: 4 },
  itemPrice: { fontSize: 14, color: C.primary, fontWeight: "800", marginTop: 6 },
  remove: { color: C.error, fontSize: 12, fontWeight: "800" },
  itemFooter: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtyRow: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyTxt: { fontSize: 18, fontWeight: "800", color: C.text },
  qtyValue: { minWidth: 38, textAlign: "center", fontSize: 16, fontWeight: "800", color: C.text },
  lineTotal: { color: C.text, fontSize: 16, fontWeight: "900" },
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 8,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  summaryLabel: { color: C.textSec, fontSize: 14 },
  summaryValue: { color: C.text, fontSize: 15, fontWeight: "700" },
  summaryHint: { color: C.textMuted, fontSize: 13, fontWeight: "700" },
  totalRow: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: "900", color: C.text },
  totalValue: { fontSize: 20, fontWeight: "900", color: C.primary },
});
