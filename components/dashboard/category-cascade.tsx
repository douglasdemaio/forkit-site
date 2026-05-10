"use client";

import { TOP_LEVEL_CATEGORIES, getSubcategories, type TopLevelCategory } from "@/lib/taxonomy";

export interface CategoryCascadeProps {
  category: string;
  subcategory: string;
  onChange: (next: { category: string; subcategory: string }) => void;
  disabled?: boolean;
}

export function CategoryCascade({ category, subcategory, onChange, disabled }: CategoryCascadeProps) {
  const safeTop: TopLevelCategory =
    (TOP_LEVEL_CATEGORIES as readonly string[]).includes(category)
      ? (category as TopLevelCategory)
      : TOP_LEVEL_CATEGORIES[0];

  const subOptions = getSubcategories(safeTop);

  function handleTopChange(next: TopLevelCategory) {
    onChange({ category: next, subcategory: getSubcategories(next)[0] });
  }

  function handleSubChange(next: string) {
    onChange({ category: safeTop, subcategory: next });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Top-level category</label>
        <select
          value={safeTop}
          onChange={(e) => handleTopChange(e.target.value as TopLevelCategory)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        >
          {TOP_LEVEL_CATEGORIES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Subcategory</label>
        <select
          value={subOptions.includes(subcategory) ? subcategory : subOptions[0]}
          onChange={(e) => handleSubChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        >
          {subOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
