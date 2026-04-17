"use client";

import { useCartStore } from "@/store/cart-store";

// Re-export the cart store hook for convenience
export function useCart() {
  const store = useCartStore();
  return {
    items: store.items,
    restaurantId: store.restaurantId,
    restaurantSlug: store.restaurantSlug,
    restaurantName: store.restaurantName,
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    total: store.getTotal(),
    itemCount: store.getItemCount(),
  };
}
