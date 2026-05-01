import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import C from "../constants/colors";
import Btn from "../components/Btn";
import { useCart } from "../context/CartContext";
import { fmt } from "../utils/helpers";

export default function ProductDetailsScreen({ navigation, route }) {
  const { product } = route.params;
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const stockQuantity = Number(product.stockQuantity || 0);
  const isOutOfStock = stockQuantity <= 0;
  const maxQty = Math.max(1, stockQuantity || 1);

  const updateQty = (delta) => {
    if (isOutOfStock) {
      return;
    }

    setQty((current) => Math.max(1, Math.min(current + delta, maxQty)));
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      return;
    }

    addItem(product, qty);
    navigation.navigate("MainTabs", { screen: "CartTab" });
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={s.image} resizeMode="cover" />
          ) : (
            <Text style={s.heroEmoji}>{product.emoji}</Text>
          )}
        </View>

        <View style={s.body}>
          <Text style={s.category}>{product.categoryName}</Text>
          <Text style={s.name}>{product.name}</Text>
          <Text style={s.price}>{fmt(product.price)}</Text>
          <Text style={s.desc}>{product.desc}</Text>

          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Availability</Text>
              <Text style={[s.statValue, isOutOfStock ? s.stockOut : null]}>
                {isOutOfStock ? "Out of stock" : `${stockQuantity} in stock`}
              </Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Price</Text>
              <Text style={s.statValue}>{fmt(product.price)}</Text>
            </View>
          </View>

          <View style={s.qtyWrap}>
            <Text style={s.qtyLabel}>Quantity</Text>
            <View style={s.qtyControls}>
              <TouchableOpacity
                style={[s.qtyBtn, isOutOfStock && s.qtyBtnDisabled]}
                onPress={() => updateQty(-1)}
                disabled={isOutOfStock}
                activeOpacity={0.8}
              >
                <Text style={s.qtyTxt}>{"\u2212"}</Text>
              </TouchableOpacity>
              <Text style={s.qtyValue}>{qty}</Text>
              <TouchableOpacity
                style={[s.qtyBtn, isOutOfStock && s.qtyBtnDisabled]}
                onPress={() => updateQty(1)}
                disabled={isOutOfStock}
                activeOpacity={0.8}
              >
                <Text style={s.qtyTxt}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Btn
            title={isOutOfStock ? "Currently Sold Out" : `Add ${qty} to Cart`}
            onPress={handleAddToCart}
            disabled={isOutOfStock}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 32 },
  hero: {
    height: 320,
    margin: 20,
    marginBottom: 0,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  heroEmoji: {
    fontSize: 84,
  },
  body: {
    padding: 20,
  },
  category: {
    color: C.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  name: {
    color: C.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 8,
  },
  price: {
    color: C.primary,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 10,
  },
  desc: {
    color: C.textSec,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 14,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  statLabel: {
    fontSize: 12,
    color: C.textSec,
    fontWeight: "700",
  },
  statValue: {
    fontSize: 16,
    color: C.text,
    fontWeight: "900",
    marginTop: 8,
  },
  stockOut: {
    color: C.error,
  },
  qtyWrap: {
    marginTop: 24,
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  qtyLabel: {
    color: C.textSec,
    fontSize: 13,
    fontWeight: "700",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyTxt: {
    color: C.text,
    fontSize: 22,
    fontWeight: "900",
  },
  qtyValue: {
    minWidth: 60,
    textAlign: "center",
    color: C.text,
    fontSize: 20,
    fontWeight: "900",
  },
});
