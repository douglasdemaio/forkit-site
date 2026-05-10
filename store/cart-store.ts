"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, MenuItemData } from "@/lib/types";

interface CartState {
  items: CartItem[];
  merchantId: string | null;
  merchantSlug: string | null;
  merchantName: string | null;

  addItem: (item: MenuItemData, merchantId: string, merchantSlug: string, merchantName: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      merchantId: null,
      merchantSlug: null,
      merchantName: null,

      addItem: (item, merchantId, merchantSlug, merchantName) => {
        const state = get();

        // If cart has items from a different merchant, clear first
        if (state.merchantId && state.merchantId !== merchantId) {
          set({
            items: [{ ...item, quantity: 1 }],
            merchantId,
            merchantSlug,
            merchantName,
          });
          return;
        }

        const existingItem = state.items.find((i) => i.id === item.id);
        if (existingItem) {
          set({
            items: state.items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
            merchantId,
            merchantSlug,
            merchantName,
          });
        } else {
          set({
            items: [...state.items, { ...item, quantity: 1 }],
            merchantId,
            merchantSlug,
            merchantName,
          });
        }
      },

      removeItem: (itemId) => {
        const state = get();
        const newItems = state.items.filter((i) => i.id !== itemId);
        if (newItems.length === 0) {
          set({
            items: [],
            merchantId: null,
            merchantSlug: null,
            merchantName: null,
          });
        } else {
          set({ items: newItems });
        }
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () =>
        set({
          items: [],
          merchantId: null,
          merchantSlug: null,
          merchantName: null,
        }),

      getTotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "forkit-cart",
    }
  )
);
