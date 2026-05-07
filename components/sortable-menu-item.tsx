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
  expanded: boolean;
  onToggle: () => void;
  onEdit: (item: MenuItemData) => void;
  onDelete: (itemId: string) => void;
}

export default function SortableMenuItem({
  item,
  restaurantId,
  restaurantSlug,
  restaurantName,
  currency,
  expanded,
  onToggle,
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

  const dragHandle = (
    <button
      type="button"
      className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 -ml-1 p-1"
      aria-label="Drag to reorder"
      onClick={(e) => e.stopPropagation()}
      {...attributes}
      {...listeners}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <MenuItemCard
        item={item}
        restaurantId={restaurantId}
        restaurantSlug={restaurantSlug}
        restaurantName={restaurantName}
        currency={currency}
        editable
        expanded={expanded}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandle={dragHandle}
      />
    </div>
  );
}
