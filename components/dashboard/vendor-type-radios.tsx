"use client";

import { VENDOR_TYPES, type VendorType } from "@/lib/taxonomy";

const COPY: Record<VendorType, { icon: string; title: string; description: string }> = {
  restaurant: {
    icon: "🍽️",
    title: "Restaurant",
    description: "Full menu, delivery + pickup, driver bidding eligible",
  },
  home_cook: {
    icon: "👨‍🍳",
    title: "Home cook",
    description: "Small fixed menu, pickup-only by default, no driver bidding",
  },
  retail: {
    icon: "🛍️",
    title: "Retail",
    description: "Inventory items, delivery + pickup, driver bidding eligible",
  },
};

export interface VendorTypeRadiosProps {
  value: VendorType;
  onChange: (value: VendorType) => void;
  disabled?: boolean;
}

export function VendorTypeRadios({ value, onChange, disabled }: VendorTypeRadiosProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {VENDOR_TYPES.map((vt) => {
        const c = COPY[vt];
        const selected = value === vt;
        return (
          <button
            key={vt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(vt)}
            className={`text-left p-4 rounded-lg border-2 transition-colors ${
              selected
                ? "border-orange-500 bg-orange-50"
                : "border-gray-200 hover:border-gray-300"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-pressed={selected}
          >
            <div className="font-medium text-gray-900">
              <span className="mr-2">{c.icon}</span>
              {c.title}
            </div>
            <div className="text-sm text-gray-500 mt-1">{c.description}</div>
          </button>
        );
      })}
    </div>
  );
}
