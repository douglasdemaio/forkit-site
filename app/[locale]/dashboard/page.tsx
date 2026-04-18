"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletAuth } from "@/hooks/useWallet";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";

interface Restaurant {
  id: string;
  wallet: string;
  payoutWallet: string | null;
  name: string;
  slug: string;
  description: string;
  template: string;
  logo: string | null;
  banner: string | null;
  currency: string;
  deliveryFee: number;
  published: boolean;
}

export default function DashboardPage() {
  const { connected } = useWallet();
  const { token, authenticate, getAuthHeaders } = useWalletAuth();
  const t = useTranslations("dashboard");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [editCurrency, setEditCurrency] = useState("");
  const [editDeliveryFee, setEditDeliveryFee] = useState(0);
  const [editPayoutWallet, setEditPayoutWallet] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const loadRestaurant = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/restaurants/mine", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.restaurant) {
          setRestaurant(data.restaurant);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, getAuthHeaders]);

  useEffect(() => {
    if (token) loadRestaurant();
    else setLoading(false);
  }, [token, loadRestaurant]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      if (res.ok || res.status === 201) {
        const data = await res.json();
        setRestaurant(data);
      } else if (res.status === 409) {
        const { restaurant: existing } = await res.json();
        setRestaurant(existing);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  // Not connected
  if (!connected) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <span className="text-6xl mb-6">👛</span>
        <h1 className="text-3xl font-bold text-forkit-dark">
          {t("connectWallet")}
        </h1>
        <p className="mt-3 text-gray-500 max-w-md">
          {t("connectWalletDesc")}
        </p>
        <div className="mt-8">
          <WalletMultiButton className="!bg-forkit-orange hover:!bg-orange-600 !rounded-xl !h-12 !text-base" />
        </div>
      </div>
    );
  }

  // Connected but not authenticated
  if (!token) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <span className="text-6xl mb-6">🔐</span>
        <h1 className="text-3xl font-bold text-forkit-dark">
          {t("signToAuth")}
        </h1>
        <p className="mt-3 text-gray-500 max-w-md">
          {t("signToAuthDesc")}
        </p>
        <button
          onClick={authenticate}
          className="mt-8 btn-primary text-lg"
        >
          {t("signContinue")}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forkit-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No restaurant yet — show creation form
  if (!restaurant) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <span className="text-5xl">🍴</span>
          <h1 className="mt-4 text-3xl font-bold text-forkit-dark">
            {t("createRestaurant")}
          </h1>
          <p className="mt-2 text-gray-500">
            {t("createRestaurantDesc")}
          </p>
        </div>

        <form onSubmit={handleCreate} className="card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("restaurantNameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("restaurantNamePlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("descriptionLabel")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? t("creating") : t("createButton")}
          </button>
        </form>
      </div>
    );
  }

  // Has restaurant — show dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {restaurant.logo ? (
            <Image
              src={restaurant.logo}
              alt=""
              width={48}
              height={48}
              className="rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-xl">
              🍴
            </div>
          )}
          <div>
            {editing ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!editName.trim() || !restaurant) return;
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/restaurants/${restaurant.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                      body: JSON.stringify({ name: editName.trim() }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      setRestaurant(updated);
                      setEditing(false);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setSaving(false);
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-bold text-forkit-dark border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={saving || !editName.trim()}
                  className="px-3 py-1.5 bg-forkit-orange text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? "..." : t("save")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700"
                >
                  {t("cancel")}
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-forkit-dark">
                  {restaurant.name}
                </h1>
                <button
                  onClick={() => { setEditName(restaurant.name); setEditing(true); }}
                  className="p-1 text-gray-400 hover:text-forkit-orange transition-colors"
                  title={t("rename")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  restaurant.published ? "bg-forkit-green" : "bg-yellow-400"
                }`}
              />
              <span className="text-sm text-gray-500">
                {restaurant.published ? t("published") : t("draft")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {restaurant.published && (
            <Link
              href={`/restaurants/${restaurant.slug}`}
              className="btn-secondary text-sm"
              target="_blank"
            >
              {t("viewLivePage")}
            </Link>
          )}
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/menu"
          className="card p-6 hover:border-forkit-orange/30 transition-colors group"
        >
          <div className="text-3xl mb-3">📋</div>
          <h3 className="font-bold text-gray-900 group-hover:text-forkit-orange transition-colors">
            {t("menuEditor")}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t("menuEditorDesc")}
          </p>
        </Link>

        <Link
          href="/dashboard/template"
          className="card p-6 hover:border-forkit-orange/30 transition-colors group"
        >
          <div className="text-3xl mb-3">🎨</div>
          <h3 className="font-bold text-gray-900 group-hover:text-forkit-orange transition-colors">
            {t("template")}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t("templateDesc")}
          </p>
        </Link>

        <Link
          href="/dashboard/orders"
          className="card p-6 hover:border-forkit-orange/30 transition-colors group"
        >
          <div className="text-3xl mb-3">📦</div>
          <h3 className="font-bold text-gray-900 group-hover:text-forkit-orange transition-colors">
            {t("orders")}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t("ordersDesc")}
          </p>
        </Link>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-3xl">⚙️</div>
            {!editingSettings && (
              <button
                onClick={() => {
                  setEditCurrency(restaurant.currency);
                  setEditDeliveryFee(restaurant.deliveryFee);
                  setEditPayoutWallet(restaurant.payoutWallet || restaurant.wallet);
                  setEditingSettings(true);
                }}
                className="text-sm text-forkit-orange hover:text-orange-600 font-medium transition-colors"
              >
                {t("editSettings")}
              </button>
            )}
          </div>
          <h3 className="font-bold text-gray-900">{t("settings")}</h3>
          {editingSettings ? (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("currency")}</label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                >
                  <option value="USDC">USDC</option>
                  <option value="EURC">EURC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("deliveryFee")}</label>
                <input
                  type="number"
                  value={editDeliveryFee}
                  onChange={(e) => setEditDeliveryFee(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("payoutWallet")}</label>
                <input
                  type="text"
                  value={editPayoutWallet}
                  onChange={(e) => setEditPayoutWallet(e.target.value)}
                  placeholder={restaurant.wallet}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                />
                <p className="mt-1 text-xs text-gray-400">{t("payoutWalletHint")}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t("slug")}</span>
                <span className="font-mono text-xs">{restaurant.slug}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => {
                    if (!restaurant) return;
                    setSavingSettings(true);
                    try {
                      const res = await fetch(`/api/restaurants/${restaurant.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                        body: JSON.stringify({ currency: editCurrency, deliveryFee: editDeliveryFee, payoutWallet: editPayoutWallet }),
                      });
                      if (res.ok) {
                        const updated = await res.json();
                        setRestaurant(updated);
                        setEditingSettings(false);
                      }
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setSavingSettings(false);
                    }
                  }}
                  disabled={savingSettings}
                  className="flex-1 px-3 py-2 bg-forkit-orange text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {savingSettings ? "..." : t("saveSettings")}
                </button>
                <button
                  onClick={() => setEditingSettings(false)}
                  className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t("currency")}</span>
                <span className="font-medium">{restaurant.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t("deliveryFee")}</span>
                <span className="font-medium">
                  {restaurant.deliveryFee.toFixed(2)} {restaurant.currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t("payoutWallet")}</span>
                <span className="font-mono text-xs truncate max-w-[140px]" title={restaurant.payoutWallet || restaurant.wallet}>
                  {(restaurant.payoutWallet || restaurant.wallet).slice(0, 8)}...{(restaurant.payoutWallet || restaurant.wallet).slice(-4)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t("slug")}</span>
                <span className="font-mono text-xs">{restaurant.slug}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
