export const VENDOR_CATEGORIES = {
  'Food & Beverage': [
    'Restaurants & fast food',
    'Grocery & supermarkets',
    'Meal kit services',
    'Bakeries & desserts',
    'Coffee & juice bars',
  ],
  'Retail & Shopping': [
    'General merchandise',
    'Clothing & apparel',
    'Electronics & gadgets',
    'Toys & games',
    'Books & media',
    'Sporting goods',
  ],
  'Health & Wellness': [
    'Vitamins & supplements',
    'Medical supplies',
    'Pet food & supplies',
  ],
  'Home & Living': [
    'Furniture & décor',
    'Hardware & tools',
    'Cleaning supplies',
    'Office supplies',
    'Plants & gardening',
  ],
  'Beauty & Personal Care': [
    'Cosmetics & skincare',
    'Hair care products',
    'Fragrances',
  ],
  'Specialty / Niche': [
    'Florists',
    'Gift & subscription boxes',
    'Convenience stores',
    'Religious / cultural goods',
  ],
  'Business & Professional': [
    'Office & janitorial supplies',
    'Restaurant supply',
    'Printing & packaging',
  ],
} as const;

export type TopLevelCategory = keyof typeof VENDOR_CATEGORIES;
export type Subcategory = (typeof VENDOR_CATEGORIES)[TopLevelCategory][number];

export const VENDOR_TYPES = ['restaurant', 'home_cook', 'retail'] as const;
export type VendorType = (typeof VENDOR_TYPES)[number];

export const TOP_LEVEL_CATEGORIES = Object.keys(VENDOR_CATEGORIES) as TopLevelCategory[];

export function getSubcategories(top: TopLevelCategory): readonly string[] {
  return VENDOR_CATEGORIES[top];
}

export function isValidCategoryPair(top: string, sub: string): boolean {
  if (!(top in VENDOR_CATEGORIES)) return false;
  return (VENDOR_CATEGORIES[top as TopLevelCategory] as readonly string[]).includes(sub);
}
