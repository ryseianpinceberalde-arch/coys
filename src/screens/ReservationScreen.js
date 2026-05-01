import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import C from "../constants/colors";
import { TIME_SLOTS, categories as fallbackCategories } from "../constants/data";
import { getCategories, getProducts } from "../services/api";
import { fmt, formatTime, getDateList } from "../utils/helpers";
import Btn from "../components/Btn";
import Input from "../components/Input";
import { createShadow } from "../utils/shadow";

const buildCategoriesFromProducts = (items) => {
  const mapped = new Map();

  items.forEach((item) => {
    if (!item.category || mapped.has(item.category)) {
      return;
    }

    mapped.set(item.category, {
      id: item.category,
      name: item.categoryName || "Items",
      icon: item.categoryIcon || "\uD83D\uDCCB",
    });
  });

  return [{ id: "all", name: "All", icon: "\uD83D\uDCCB" }, ...mapped.values()];
};

export default function ReservationScreen({ navigation }) {
  const [date, setDate] = useState(null);
  const [time, setTime] = useState("");
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState(fallbackCategories);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selCat, setSelCat] = useState("all");
  const dates = getDateList();

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      setCatalogLoading(true);
      const [productsResult, categoriesResult] = await Promise.allSettled([getProducts(), getCategories()]);

      if (!active) {
        return;
      }

      if (productsResult.status === "fulfilled") {
        setProducts(productsResult.value);
      } else {
        setProducts([]);
        Alert.alert("Catalog Unavailable", productsResult.reason?.message || "Unable to load the reservation menu right now.");
      }

      if (categoriesResult.status === "fulfilled" && categoriesResult.value.length) {
        setAvailableCategories(categoriesResult.value);
      } else if (productsResult.status === "fulfilled") {
        setAvailableCategories(buildCategoriesFromProducts(productsResult.value));
      } else {
        setAvailableCategories(fallbackCategories);
      }

      setCatalogLoading(false);
    };

    loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  const addItem = (p) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      if (ex) return prev.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const updateQty = (id, d) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: i.qty + d } : i).filter((i) => i.qty > 0));
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const filtered = selCat === "all" ? products : products.filter((p) => p.category === selCat);

  const proceed = () => {
    if (!date) return Alert.alert("Select Date", "Pick a reservation date");
    if (!time) return Alert.alert("Select Time", "Pick a time slot");
    if (!cart.length) return Alert.alert("Empty Cart", "Add at least one item");
    navigation.navigate("CustomerDetails", { date, time, cart, notes, total });
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>New Reservation</Text>

        {/* Date picker */}
        <Text style={s.label}>{"\uD83D\uDCC5"} Choose Date</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={dates}
          keyExtractor={(d) => d.key}
          contentContainerStyle={{ paddingBottom: 4 }}
          renderItem={({ item: d }) => (
            <TouchableOpacity
              onPress={() => setDate(d)}
              style={[s.dateCard, date?.key === d.key && s.dateActive]}
              activeOpacity={0.7}
            >
              <Text style={[s.dateDay, date?.key === d.key && s.dateTxtActive]}>{d.day}</Text>
              <Text style={[s.dateNum, date?.key === d.key && s.dateTxtActive]}>{d.date}</Text>
              <Text style={[s.dateMon, date?.key === d.key && s.dateTxtActive]}>{d.month}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Time picker */}
        <Text style={s.label}>{"\u23F0"} Choose Time</Text>
        <View style={s.timeGrid}>
          {TIME_SLOTS.map((slot) => (
            <TouchableOpacity key={slot} onPress={() => setTime(slot)}
              style={[s.timeChip, time === slot && s.timeActive]} activeOpacity={0.7}>
              <Text style={[s.timeTxt, time === slot && s.timeTxtActive]}>{formatTime(slot)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category pills */}
        <Text style={s.label}>{"\uD83D\uDED2"} Select Items</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {availableCategories.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setSelCat(c.id)}
              style={[s.catPill, selCat === c.id && s.catActive]} activeOpacity={0.7}>
              <Text style={[s.catTxt, selCat === c.id && s.catTxtActive]}>{c.icon} {c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products */}
        {catalogLoading ? <Text style={s.emptyText}>Loading menu...</Text> : null}
        {!catalogLoading && !filtered.length ? <Text style={s.emptyText}>No items available in this category right now.</Text> : null}
        {filtered.map((p) => (
          <View key={p.id} style={s.prodCard}>
            <View style={s.prodEmBox}><Text style={{ fontSize: 24 }}>{p.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.prodName}>{p.name}</Text>
              <Text style={s.prodDesc} numberOfLines={1}>{p.desc}</Text>
              <Text style={s.prodPrice}>{fmt(p.price)}</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={() => addItem(p)} activeOpacity={0.7}>
              <Text style={s.addTxt}>+</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Cart */}
        {cart.length > 0 && (
          <View style={s.cartBox}>
            <Text style={s.label}>{"\uD83E\uDDFE"} Your Items ({count})</Text>
            {cart.map((i) => (
              <View key={i.id} style={s.cartRow}>
                <Text style={{ fontSize: 18 }}>{i.emoji}</Text>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={s.cartName}>{i.name}</Text>
                  <Text style={s.cartSub}>{fmt(i.price)}</Text>
                </View>
                <View style={s.qtyRow}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(i.id, -1)}><Text style={s.qtyTxt}>{"\u2212"}</Text></TouchableOpacity>
                  <Text style={s.qtyNum}>{i.qty}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(i.id, 1)}><Text style={s.qtyTxt}>+</Text></TouchableOpacity>
                </View>
                <Text style={s.cartTotal}>{fmt(i.price * i.qty)}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalVal}>{fmt(total)}</Text>
            </View>
          </View>
        )}

        <Input label={"\uD83D\uDCDD Notes (optional)"} value={notes} onChangeText={setNotes}
          placeholder="Special requests, allergies..." multiline style={{ marginTop: 14 }} />

        <Btn title={"Proceed \u2014 " + fmt(total)} onPress={proceed} disabled={!cart.length} style={{ marginTop: 16, marginBottom: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: C.text, marginBottom: 16 },
  label: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 10, marginTop: 18 },

  dateCard: { width: 64, paddingVertical: 12, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, alignItems: "center", marginRight: 8 },
  dateActive: { backgroundColor: C.primary, borderColor: C.primary },
  dateDay: { fontSize: 11, fontWeight: "600", color: C.textSec },
  dateNum: { fontSize: 20, fontWeight: "800", color: C.text, marginVertical: 2 },
  dateMon: { fontSize: 11, color: C.textSec },
  dateTxtActive: { color: C.white },

  timeGrid: { flexDirection: "row", flexWrap: "wrap" },
  timeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, margin: 3 },
  timeActive: { backgroundColor: C.primary, borderColor: C.primary },
  timeTxt: { fontSize: 13, fontWeight: "600", color: C.textSec },
  timeTxtActive: { color: C.white },

  catPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  catActive: { backgroundColor: C.primary, borderColor: C.primary },
  catTxt: { fontSize: 13, fontWeight: "600", color: C.textSec },
  catTxtActive: { color: C.white },

  prodCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 12, padding: 12, marginBottom: 8, ...createShadow({ radius: 4 }) },
  prodEmBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 12 },
  prodName: { fontSize: 14, fontWeight: "700", color: C.text },
  prodDesc: { fontSize: 11, color: C.textSec, marginTop: 1 },
  prodPrice: { fontSize: 13, fontWeight: "700", color: C.primary, marginTop: 3 },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primary, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  addTxt: { color: C.white, fontSize: 22, fontWeight: "700", lineHeight: 24 },

  cartBox: { backgroundColor: C.surface, borderRadius: 14, padding: 14, marginTop: 14, ...createShadow({ radius: 4 }) },
  cartRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider },
  cartName: { fontSize: 13, fontWeight: "600", color: C.text },
  cartSub: { fontSize: 11, color: C.textSec },
  qtyRow: { flexDirection: "row", alignItems: "center", marginRight: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  qtyTxt: { fontSize: 16, fontWeight: "700", color: C.text },
  qtyNum: { fontSize: 14, fontWeight: "700", minWidth: 24, textAlign: "center" },
  cartTotal: { fontSize: 13, fontWeight: "700", color: C.primary, minWidth: 55, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  totalLabel: { fontSize: 16, fontWeight: "800", color: C.text },
  totalVal: { fontSize: 16, fontWeight: "800", color: C.primary },
  emptyText: { fontSize: 13, color: C.textSec, marginBottom: 12 },
});
