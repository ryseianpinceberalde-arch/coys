import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearCartStorage, getCart, saveCart } from "../services/storage";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;

    getCart()
      .then((storedItems) => {
        if (active) {
          setItems(Array.isArray(storedItems) ? storedItems : []);
        }
      })
      .finally(() => {
        if (active) {
          setRestored(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restored) {
      return;
    }

    saveCart(items);
  }, [items, restored]);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((entry) => entry.id === product.id);
      if (!existing) {
        return [
          ...prev,
          {
            ...product,
            qty: Math.min(quantity, product.stockQuantity || quantity)
          }
        ];
      }

      const nextQty = Math.min(existing.qty + quantity, existing.stockQuantity || existing.qty + quantity);
      return prev.map((entry) => (entry.id === product.id ? { ...entry, qty: nextQty } : entry));
    });
  };

  const updateQty = (productId, quantity) => {
    setItems((prev) =>
      prev
        .map((entry) =>
          entry.id === productId
            ? { ...entry, qty: Math.max(0, Math.min(quantity, entry.stockQuantity || quantity)) }
            : entry
        )
        .filter((entry) => entry.qty > 0)
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((entry) => entry.id !== productId));
  };

  const clearCart = async () => {
    setItems([]);
    await clearCartStorage();
  };

  const value = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    return {
      items,
      restored,
      itemCount,
      subtotal,
      addItem,
      updateQty,
      removeItem,
      clearCart,
    };
  }, [items, restored]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
};
