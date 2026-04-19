"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getTemplate, getTemplateStyles } from "@/lib/templates";
import { MenuItemData } from "@/lib/types";
import MenuItemCard from "@/components/menu-item-card";
import { getFont, googleFontsUrl } from "@/lib/fonts";

interface RestaurantWithMenu {
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

export default function RestaurantPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [restaurant, setRestaurant] = useState<RestaurantWithMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/restaurants/${slug}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setRestaurant(data);
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

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <span className="text-6xl">😕</span>
        <h1 className="mt-6 text-2xl font-bold">Restaurant not found</h1>
        <Link href="/restaurants" className="mt-4 text-forkit-orange hover:underline">
          Browse restaurants
        </Link>
      </div>
    );
  }

  const template = getTemplate(restaurant.template);
  const baseStyles = getTemplateStyles(restaurant.template);

  // Apply custom branding: colors override template defaults; font overrides default font.
  const primary = restaurant.colorPrimary || template.colors.primary;
  const secondary = restaurant.colorSecondary || template.colors.secondary;
  const accent = restaurant.colorAccent || template.colors.text;
  const font = getFont(restaurant.fontFamily);
  const fontStack = font?.stack || (baseStyles as any).fontFamily || "system-ui, sans-serif";
  const fontUrl = restaurant.fontFamily ? googleFontsUrl([restaurant.fontFamily]) : "";

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

  const categories = ["All", ...Array.from(new Set(restaurant.menuItems.map((i) => i.category)))];
  const filteredItems =
    activeCategory === "All"
      ? restaurant.menuItems
      : restaurant.menuItems.filter((i) => i.category === activeCategory);

  return (
    <div style={styles} className="min-h-screen">
      {fontUrl && (
        /* eslint-disable-next-line @next/next/no-css-tags */
        <link href={fontUrl} rel="stylesheet" />
      )}
      {/* Banner */}
      <div className="relative h-64 lg:h-80 overflow-hidden">
        {restaurant.banner ? (
          <Image
            src={restaurant.banner}
            alt={restaurant.name}
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

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto flex items-end gap-4">
            {restaurant.logo && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                <Image
                  src={restaurant.logo}
                  alt=""
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white">
                {restaurant.name}
              </h1>
              {restaurant.description && (
                <p className="mt-1 text-white/80 max-w-xl">
                  {restaurant.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? "text-white"
                  : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor:
                  activeCategory === cat
                    ? colors.primary
                    : colors.primary + "15",
                color:
                  activeCategory === cat ? "#fff" : colors.primary,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Delivery fee info */}
        {restaurant.deliveryFee > 0 && (
          <div
            className="mb-6 p-3 rounded-xl text-sm flex items-center gap-2"
            style={{
              backgroundColor: colors.primary + "10",
              color: colors.text,
            }}
          >
            🚚 Delivery fee: {restaurant.deliveryFee.toFixed(2)}{" "}
            {restaurant.currency}
          </div>
        )}

        {/* Menu grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 opacity-60">
            <span className="text-4xl">🍽️</span>
            <p className="mt-4">No items in this category yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                restaurantId={restaurant.id}
                restaurantSlug={restaurant.slug}
                restaurantName={restaurant.name}
                currency={restaurant.currency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
