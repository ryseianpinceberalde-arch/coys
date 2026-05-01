import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import C from "../constants/colors";
import ProductCard from "../components/ProductCard";
import { getCategories, getProducts, getStoreSettings } from "../services/api";
import { useCart } from "../context/CartContext";

export default function HomeScreen({ navigation, isGuest }) {
  const { addItem, itemCount } = useCart();
  const activeRef = useRef(true);
  const [settings, setSettings] = useState({ name: "Coy's Corner", taxRate: 0, logoUrl: "" });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");

  const loadCatalog = async ({ withLoading = false, withRefresh = false } = {}) => {
    if (withLoading) {
      setLoading(true);
    }

    if (withRefresh) {
      setRefreshing(true);
    }

    const [settingsResult, categoriesResult, productsResult] = await Promise.allSettled([
      getStoreSettings(),
      getCategories(),
      getProducts(),
    ]);

    if (!activeRef.current) {
      return;
    }

    if (settingsResult.status === "fulfilled") {
      setSettings(settingsResult.value);
    }

    if (categoriesResult.status === "fulfilled") {
      setCategories(categoriesResult.value);
    }

    if (productsResult.status === "fulfilled") {
      setProducts(productsResult.value);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadCatalog({ withLoading: true });
    return () => {
      activeRef.current = false;
    };
  }, []);

  const featuredProducts = useMemo(
    () => products.filter((product) => Number(product.stockQuantity || 0) > 0).slice(0, 4),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.categoryName.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  const openProduct = (product) => {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate("ProductDetails", { product });
      return;
    }
    navigation.navigate("ProductDetails", { product });
  };

  const handleRefresh = () => {
    loadCatalog({ withRefresh: true });
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        )}
      >
        <View style={s.hero}>
          <View style={s.heroHeader}>
            <View style={s.heroBrandBlock}>
              <View style={[s.heroLogo, settings.logoUrl && s.heroLogoImageWrap]}>
                {settings.logoUrl ? (
                  <Image source={{ uri: settings.logoUrl }} style={s.heroLogoImage} resizeMode="contain" />
                ) : (
                  <Text style={s.heroLogoFallback}>{"\uD83C\uDF7D\uFE0F"}</Text>
                )}
              </View>
              <Text style={s.eyebrow}>{isGuest ? "Guest Ordering" : "Customer Ordering"}</Text>
              <Text style={s.heroTitle}>{settings.name || "Coy's Corner"}</Text>
              <Text style={s.heroSub}>Browse live products, place your order, and track it from your phone.</Text>
            </View>

            {itemCount > 0 ? (
              <TouchableOpacity style={s.cartChip} activeOpacity={0.85} onPress={() => navigation.navigate("CartTab")}>
                <Text style={s.cartChipText}>{itemCount} in cart</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products or categories"
            placeholderTextColor={C.textMuted}
            style={s.search}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRow}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                activeOpacity={0.85}
                onPress={() => setSelectedCategory(category.id)}
                style={[s.categoryChip, selectedCategory === category.id && s.categoryChipActive]}
              >
                <Text style={[s.categoryText, selectedCategory === category.id && s.categoryTextActive]}>
                  {category.icon} {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Featured Today</Text>
          <Text style={s.sectionMeta}>{featuredProducts.length} highlights</Text>
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={C.primary} />
            <Text style={s.loadingText}>Loading live catalog...</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
              {featuredProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  activeOpacity={0.9}
                  onPress={() => openProduct(product)}
                  style={s.featuredCard}
                >
                  <View style={s.featuredEmoji}>
                    <Text style={{ fontSize: 28 }}>{product.emoji}</Text>
                  </View>
                  <Text style={s.featuredName} numberOfLines={2}>{product.name}</Text>
                  <Text style={s.featuredPrice}>₱{product.price.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Full Catalog</Text>
              <Text style={s.sectionMeta}>{filteredProducts.length} products</Text>
            </View>

            {!filteredProducts.length ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyEmoji}>{"\uD83D\uDED2"}</Text>
                <Text style={s.emptyTitle}>No products found</Text>
                <Text style={s.emptySub}>Try another search or category.</Text>
              </View>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  item={product}
                  onPress={() => openProduct(product)}
                  onAdd={() => addItem(product, 1)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 32 },
  hero: {
    padding: 20,
    backgroundColor: C.surface,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderWidth: 1,
    borderColor: C.border,
    borderTopWidth: 0,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  heroBrandBlock: {
    flexShrink: 1,
  },
  heroLogo: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  heroLogoImageWrap: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  heroLogoImage: {
    width: "100%",
    height: "100%",
  },
  heroLogoFallback: {
    fontSize: 28,
    color: C.white,
  },
  eyebrow: {
    color: C.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.8,
    marginTop: 8,
  },
  heroSub: {
    color: C.textSec,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 280,
  },
  cartChip: {
    alignSelf: "flex-start",
    backgroundColor: C.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cartChipText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "800",
  },
  search: {
    marginTop: 18,
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 15,
  },
  categoryRow: {
    paddingTop: 16,
    paddingBottom: 2,
    paddingRight: 20,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  categoryText: {
    color: C.textSec,
    fontSize: 13,
    fontWeight: "700",
  },
  categoryTextActive: {
    color: C.white,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
  },
  sectionMeta: {
    fontSize: 12,
    color: C.textSec,
    fontWeight: "700",
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: C.textSec,
    fontSize: 14,
  },
  featuredCard: {
    width: 180,
    marginLeft: 20,
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  featuredEmoji: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  featuredName: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
    minHeight: 42,
  },
  featuredPrice: {
    marginTop: 10,
    color: C.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  emptySub: { fontSize: 13, color: C.textSec, marginTop: 6 },
});
