"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { MerchantData } from "@/lib/types";
import { getTemplate } from "@/lib/templates";

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<(MerchantData & { _count?: { menuItems: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        const res = await fetch(`/api/merchants?${params}`);
        const data = await res.json();
        setMerchants(data.merchants || []);
      } catch (err) {
        console.error("Failed to load merchants:", err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-forkit-dark">Merchants</h1>
          <p className="text-gray-500 mt-1">
            Browse merchants accepting crypto payments
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-2xl" />
              <div className="p-6 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : merchants.length === 0 ? (
        <div className="text-center py-24">
          <span className="text-6xl">🍽️</span>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            No merchants yet
          </h2>
          <p className="mt-2 text-gray-500">
            Be the first to set up your merchant on ForkIt!
          </p>
          <Link href="/dashboard" className="btn-primary mt-6 inline-block">
            Create Your Merchant
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchants.map((merchant) => {
            const template = getTemplate(merchant.template);
            const mPrimary = merchant.colorPrimary || template.colors.primary;
            const mSecondary = merchant.colorSecondary || template.colors.secondary;
            return (
              <Link
                key={merchant.id}
                href={`/merchants/${merchant.slug}`}
                className="card overflow-hidden group"
              >
                {/* Banner */}
                <div
                  className="h-48 relative overflow-hidden"
                  style={{ backgroundColor: template.colors.background }}
                >
                  {merchant.banner ? (
                    <Image
                      src={merchant.banner}
                      alt={merchant.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className="h-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${mPrimary}40, ${mSecondary}40)`,
                      }}
                    >
                      <span className="text-5xl opacity-50">🍴</span>
                    </div>
                  )}

                  {/* Logo overlay */}
                  {merchant.logo && (
                    <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md">
                      <Image
                        src={merchant.logo}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 transition-colors"
                    style={{ color: merchant.colorPrimary ? mPrimary : undefined }}
                  >
                    {merchant.name}
                  </h3>
                  {merchant.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {merchant.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      🍽️ {merchant._count?.menuItems || 0} items
                    </span>
                    <span className="flex items-center gap-1">
                      💰 {merchant.currency}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: mPrimary + "15",
                        color: mPrimary,
                      }}
                    >
                      {template.name}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
