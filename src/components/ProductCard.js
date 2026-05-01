import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import C from "../constants/colors";
import { fmt } from "../utils/helpers";
import { createShadow } from "../utils/shadow";

export default function ProductCard({ item, onPress, onAdd }) {
  const isOutOfStock = Number(item.stockQuantity || 0) <= 0;

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.92} onPress={onPress}>
      <View style={s.imageWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={s.image} resizeMode="cover" />
        ) : (
          <Text style={s.emoji}>{item.emoji}</Text>
        )}
      </View>

      <View style={s.body}>
        <Text style={s.category}>{item.categoryName}</Text>
        <Text style={s.name} numberOfLines={2}>{item.name}</Text>
        <Text style={s.desc} numberOfLines={2}>{item.desc}</Text>

        <View style={s.footer}>
          <View style={{ flex: 1 }}>
            <Text style={s.price}>{fmt(item.price)}</Text>
            <Text style={[s.stock, isOutOfStock ? s.stockOut : null]}>
              {isOutOfStock ? "Out of stock" : `${item.stockQuantity} in stock`}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onAdd}
            disabled={isOutOfStock}
            activeOpacity={0.8}
            style={[s.addBtn, isOutOfStock && s.addBtnDisabled]}
          >
            <Text style={s.addTxt}>{isOutOfStock ? "Sold Out" : "Add"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    ...createShadow({ color: "#0f172a", opacity: 0.05, radius: 14, offsetY: 8, elevation: 2 }),
  },
  imageWrap: {
    height: 164,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  emoji: {
    fontSize: 58,
  },
  body: {
    padding: 16,
  },
  category: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: C.primaryDark,
    marginBottom: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
  },
  desc: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 6,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 16,
    gap: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: C.primary,
  },
  stock: {
    fontSize: 12,
    color: C.success,
    marginTop: 4,
  },
  stockOut: {
    color: C.error,
  },
  addBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  addBtnDisabled: {
    backgroundColor: C.border,
  },
  addTxt: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
  },
});
