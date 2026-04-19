"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MenuItemData } from "@/lib/types";
import MenuItemCard from "./menu-item-card";

interface Props {
  item: MenuItemData;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  currency: string;
  onEdit: (item: MenuItemData) => void;
  onDelete: (itemId: string) => void;
}

export default function SortableMenuItem({
  item,
  restaurantId,
  restaurantSlug,
  restaurantName,
  currency,
  onEdit,
  onDelete,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle */}
      <button
        type="button"
        className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur border border-gray-200 rounded-lg p-2 cursor-grab active:cursor-grabbing hover:bg-white shadow-sm touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
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
          className="text-gray-600"
        >
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>
      <MenuItemCard
        item={item}
        restaurantId={restaurantId}
        restaurantSlug={restaurantSlug}
        restaurantName={restaurantName}
        currency={currency}
        editable
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
