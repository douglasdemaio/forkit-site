"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getTemplate, getTemplateStyles } from "@/lib/templates";
import { MenuItemData } from "@/lib/types";
import MenuItemCard from "@/components/menu-item-card";
import { getFont, googleFontsUrl } from "@/lib/fonts";

interface MerchantWithMenu {
  id: string;
  wallet: string;
  name: string;
  slug: string;
  description: string;
  template: string;
  logo: string | null;
  banner: string | null;
  currency: string;
  deliveryFee: number;
  colorPrimary: string | null;
  colorSecondary: string | null;
  colorAccent: string | null;
  fontFamily: string | null;
  menuItems: MenuItemData[];
}

export default function MerchantPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [merchant, setMerchant] = useState<MerchantWithMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/merchants/${slug}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setMerchant(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forkit-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <span className="text-6xl">😕</span>
        <h1 className="mt-6 text-2xl font-bold">Merchant not found</h1>
        <Link href="/merchants" className="mt-4 text-forkit-orange hover:underline">
          Browse merchants
        </Link>
      </div>
    );
  }

  const template = getTemplate(merchant.template);
  const baseStyles = getTemplateStyles(merchant.template);

  // Apply custom branding: colors override template defaults; font overrides default font.
  const primary = merchant.colorPrimary || template.colors.primary;
  const secondary = merchant.colorSecondary || template.colors.secondary;
  const accent = merchant.colorAccent || template.colors.text;
  const font = getFont(merchant.fontFamily);
  const fontStack = font?.stack || (baseStyles as any).fontFamily || "system-ui, sans-serif";
  const fontUrl = merchant.fontFamily ? googleFontsUrl([merchant.fontFamily]) : "";

  // Merged color palette for use below
  const colors = {
    primary,
    secondary,
    text: accent,
    background: secondary,
  };

  const styles = {
    ...baseStyles,
    backgroundColor: secondary,
    color: accent,
    fontFamily: fontStack,
  };

  const categories = ["All", ...Array.from(new Set(merchant.menuItems.map((i) => i.category)))];
  const filteredItems =
    activeCategory === "All"
      ? merchant.menuItems
      : merchant.menuItems.filter((i) => i.category === activeCategory);

  return (
    <div style={styles} className="min-h-screen">
      {fontUrl && (
        /* eslint-disable-next-line @next/next/no-css-tags */
        <link href={fontUrl} rel="stylesheet" />
      )}
      {/* Banner */}
      <div className="relative h-64 lg:h-80 overflow-hidden">
        {merchant.banner ? (
          <Image
            src={merchant.banner}
            alt={merchant.name}
            fill
            className="object-cover"
          />
        ) : (
          <div
            className="h-full"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Merchant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto flex items-end gap-4">
            {merchant.logo && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                <Image
                  src={merchant.logo}
                  alt=""
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white">
                {merchant.name}
              </h1>
              {merchant.description && (
                <p className="mt-1 text-white/80 max-w-xl">
                  {merchant.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured slot reserved for promoted item (follow-up spec) */}
        <div data-featured-slot aria-hidden="true" />

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "text-white shadow-sm"
                  : "hover:opacity-100"
              }`}
              style={{
                backgroundColor:
                  activeCategory === cat
                    ? colors.primary
                    : colors.primary + "15",
                color:
                  activeCategory === cat ? "#fff" : colors.primary,
                opacity: activeCategory === cat ? 1 : 0.65,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Delivery fee info */}
        {merchant.deliveryFee > 0 && (
          <div
            className="mb-6 p-3 rounded-xl text-sm flex items-center gap-2 border"
            style={{
              backgroundColor: colors.primary + "10",
              color: colors.text,
              borderColor: colors.primary + "20",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: colors.primary }}
            />
            🚚 Delivery fee: {merchant.deliveryFee.toFixed(2)}{" "}
            {merchant.currency}
          </div>
        )}

        {/* Accent divider */}
        <div
          className="w-16 h-0.5 rounded-full mb-6"
          style={{ backgroundColor: colors.primary + "40" }}
        />

        {/* Menu grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 opacity-60">
            <span className="text-4xl">🍽️</span>
            <p className="mt-4">No items in this category yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                merchantId={merchant.id}
                merchantSlug={merchant.slug}
                merchantName={merchant.name}
                currency={merchant.currency}
                themePrimary={colors.primary}
                themeAccent={colors.text}
                expanded={expandedId === item.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === item.id ? null : item.id))
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
