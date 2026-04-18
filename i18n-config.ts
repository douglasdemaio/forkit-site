export const locales = ['en', 'de', 'es', 'fr', 'ja', 'zh', 'pt', 'ko', 'ar', 'tr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
