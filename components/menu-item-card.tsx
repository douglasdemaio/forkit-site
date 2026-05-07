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
  expanded: boolean;
  onToggle: () => void;
  dragHandle?: React.ReactNode;
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
  expanded,
  onToggle,
  dragHandle,
}: MenuItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(item, restaurantId, restaurantSlug, restaurantName);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <article
      className={`bg-white rounded-xl border border-gray-100 overflow-hidden transition-shadow ${
        expanded ? "shadow-lg" : "hover:shadow-md"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={handleRowKeyDown}
        className="w-full flex items-center gap-3 p-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-forkit-orange/40"
      >
        {dragHandle}

        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200">
          {item.image ? (
            <Image src={item.image} alt={item.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl">🍽️</span>
            </div>
          )}
          {!item.available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold uppercase tracking-wide">
                Sold out
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-gray-500 truncate">{item.description}</p>
          )}
        </div>

        <span className="text-forkit-orange font-bold whitespace-nowrap text-sm">
          {item.price.toFixed(2)} {currency}
        </span>

        {!editable && item.available && (
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label={`Add ${item.name} to cart`}
            className="w-8 h-8 rounded-full bg-forkit-orange text-white flex items-center justify-center text-lg font-bold leading-none hover:bg-orange-600 transition-colors flex-shrink-0"
          >
            +
          </button>
        )}

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-gray-400 transition-transform flex-shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-4 border-t border-gray-100">
            <div className="relative aspect-[16/9] max-h-60 mt-3 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl">🍽️</span>
                </div>
              )}
              {!item.available && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">Sold Out</span>
                </div>
              )}
            </div>

            {item.category && (
              <span className="inline-block mt-3 px-2.5 py-1 bg-orange-50 text-forkit-orange text-xs font-semibold rounded-full">
                {item.category}
              </span>
            )}

            {item.description && (
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {item.description}
              </p>
            )}

            <div className="mt-4">
              {editable ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit?.(item)}
                    className="flex-1 py-2 px-4 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete?.(item.id)}
                    className="py-2 px-4 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!item.available}
                  onClick={() =>
                    addItem(item, restaurantId, restaurantSlug, restaurantName)
                  }
                  className="w-full py-2.5 px-4 bg-forkit-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                >
                  {item.available
                    ? `Add to cart · ${item.price.toFixed(2)} ${currency}`
                    : "Unavailable"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
