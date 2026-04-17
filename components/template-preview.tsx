"use client";

import { TemplateDefinition } from "@/lib/types";

interface TemplatePreviewProps {
  template: TemplateDefinition;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function TemplatePreview({
  template,
  selected,
  onSelect,
}: TemplatePreviewProps) {
  return (
    <button
      onClick={() => onSelect(template.id)}
      className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
        selected
          ? "border-forkit-orange shadow-lg scale-[1.02]"
          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
      }`}
    >
      {/* Template preview */}
      <div
        className="h-48 p-6 flex flex-col justify-between"
        style={{
          backgroundColor: template.colors.background,
          color: template.colors.text,
          fontFamily: template.font,
        }}
      >
        <div>
          <div
            className="w-8 h-1 rounded mb-3"
            style={{ backgroundColor: template.colors.primary }}
          />
          <h3 className="text-lg font-bold" style={{ color: template.colors.text }}>
            Restaurant Name
          </h3>
          <p className="text-xs mt-1 opacity-60">Fresh flavors, served daily</p>
        </div>
        <div className="flex gap-2">
          {["Starters", "Mains", "Desserts"].map((cat) => (
            <span
              key={cat}
              className="text-[10px] px-2 py-1 rounded-full"
              style={{
                backgroundColor: template.colors.primary + "20",
                color: template.colors.primary,
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-white">
        <h4 className="font-semibold text-gray-900">{template.name}</h4>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {template.description}
        </p>
      </div>

      {/* Selected badge */}
      {selected && (
        <div className="absolute top-3 right-3 bg-forkit-orange text-white rounded-full p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}
