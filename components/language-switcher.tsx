"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { locales, type Locale } from "@/i18n-config";

const languageNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  ja: "日本語",
  zh: "中文",
  pt: "Português",
  ko: "한국어",
  ar: "العربية",
  tr: "Türkçe",
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    // Remove current locale prefix from pathname if present
    let path = pathname;
    for (const loc of locales) {
      if (path.startsWith(`/${loc}/`) || path === `/${loc}`) {
        path = path.slice(`/${loc}`.length) || "/";
        break;
      }
    }
    // For default locale (en), no prefix needed; for others, add prefix
    const newPath = newLocale === "en" ? path : `/${newLocale}${path}`;
    router.push(newPath);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-forkit-orange border border-gray-200 rounded-lg hover:border-forkit-orange/30 transition-colors"
        aria-label="Switch language"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
        <span>{languageNames[locale as Locale] || locale}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 max-h-80 overflow-y-auto">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 transition-colors ${
                loc === locale
                  ? "text-forkit-orange font-medium bg-orange-50/50"
                  : "text-gray-700"
              }`}
            >
              {languageNames[loc]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
