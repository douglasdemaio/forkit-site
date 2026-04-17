"use client";

import Image from "next/image";
import { MenuItemData } from "@/lib/types";
import { useCartStore } from "@/store/cart-store";

interface MenuItemCardProps {
  item: MenuItemData;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  currency?: string;
  editable?: boolean;
  onEdit?: (item: MenuItemData) => void;
  onDelete?: (itemId: string) => void;
}

export default function MenuItemCard({
  item,
  restaurantId,
  restaurantSlug,
  restaurantName,
  currency = "USDC",
  editable = false,
  onEdit,
  onDelete,
}: MenuItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group">
      {item.image ? (
        <div className="relative h-48 overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {!item.available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                Sold Out
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <span className="text-4xl">🍽️</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {item.description}
            </p>
          </div>
          <span className="text-forkit-orange font-bold whitespace-nowrap">
            {item.price.toFixed(2)} {currency}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {editable ? (
            <>
              <button
                onClick={() => onEdit?.(item)}
                className="flex-1 py-2 px-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete?.(item.id)}
                className="py-2 px-3 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              disabled={!item.available}
              onClick={() =>
                addItem(item, restaurantId, restaurantSlug, restaurantName)
              }
              className="w-full py-2 px-4 bg-forkit-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {item.available ? "Add to Cart" : "Unavailable"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
