"use client";

import { useCartStore } from "@/store/cart-store";

// Re-export the cart store hook for convenience
export function useCart() {
  const store = useCartStore();
  return {
    items: store.items,
    merchantId: store.merchantId,
    merchantSlug: store.merchantSlug,
    merchantName: store.merchantName,
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    total: store.getTotal(),
    itemCount: store.getItemCount(),
  };
}
