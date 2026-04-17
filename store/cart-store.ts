"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, MenuItemData } from "@/lib/types";

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantName: string | null;

  addItem: (item: MenuItemData, restaurantId: string, restaurantSlug: string, restaurantName: string) => void;
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
      restaurantId: null,
      restaurantSlug: null,
      restaurantName: null,

      addItem: (item, restaurantId, restaurantSlug, restaurantName) => {
        const state = get();

        // If cart has items from a different restaurant, clear first
        if (state.restaurantId && state.restaurantId !== restaurantId) {
          set({
            items: [{ ...item, quantity: 1 }],
            restaurantId,
            restaurantSlug,
            restaurantName,
          });
          return;
        }

        const existingItem = state.items.find((i) => i.id === item.id);
        if (existingItem) {
          set({
            items: state.items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
            restaurantId,
            restaurantSlug,
            restaurantName,
          });
        } else {
          set({
            items: [...state.items, { ...item, quantity: 1 }],
            restaurantId,
            restaurantSlug,
            restaurantName,
          });
        }
      },

      removeItem: (itemId) => {
        const state = get();
        const newItems = state.items.filter((i) => i.id !== itemId);
        if (newItems.length === 0) {
          set({
            items: [],
            restaurantId: null,
            restaurantSlug: null,
            restaurantName: null,
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
          restaurantId: null,
          restaurantSlug: null,
          restaurantName: null,
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
