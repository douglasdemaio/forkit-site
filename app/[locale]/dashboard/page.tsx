"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletAuth } from "@/hooks/useWallet";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { VendorTypeRadios } from "@/components/dashboard/vendor-type-radios";
import { CategoryCascade } from "@/components/dashboard/category-cascade";
import { LocationMap } from "@/components/dashboard/location-map";
import type { VendorType } from "@/lib/taxonomy";

interface Merchant {
  id: string;
  wallet: string;
  payoutWallet: string | null;
  name: string;
  slug: string;
  description: string;
  vendorType: VendorType;
  pickupOnly: boolean;
  category: string;
  subcategory: string;
  addressStreet: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  latitude: number | null;
  longitude: number | null;
  template: string;
  logo: string | null;
  banner: string | null;
  currency: string;
  deliveryFee: number;
  published: boolean;
  autoAcknowledge: boolean;
  selfDelivery: boolean;
}

export default function DashboardPage() {
  const { connected } = useWallet();
  const { token, authenticate, getAuthHeaders, clearToken, authError, isAuthenticating } = useWalletAuth();
  const t = useTranslations("dashboard");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vendorType, setVendorType] = useState<VendorType>("restaurant");
  const [pickupOnly, setPickupOnly] = useState(false);
  const [pickupOnlyManuallySet, setPickupOnlyManuallySet] = useState(false);
  const [category, setCategory] = useState("Food & Beverage");
  const [subcategory, setSubcategory] = useState("Restaurants & fast food");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  function handleVendorTypeChange(next: VendorType) {
    setVendorType(next);
    if (next === "home_cook" && !pickupOnlyManuallySet) {
      setPickupOnly(true);
    }
  }

  const geocodeAbortRef = useRef<AbortController | null>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const triggerGeocode = useCallback(() => {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(async () => {
      const parts = [addressStreet, addressCity, addressCountry]
        .map((p) => p.trim())
        .filter((p) => p !== "");
      if (parts.length < 2) return;
      const q = parts.join(", ");

      geocodeAbortRef.current?.abort();
      const ctrl = new AbortController();
      geocodeAbortRef.current = ctrl;

      setGeocodeError(null);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (res.status === 404) {
          setGeocodeError("We couldn't find that address — drop a pin manually.");
          return;
        }
        if (!res.ok) {
          setGeocodeError("Geocoding is busy — drop a pin manually or try again in a minute.");
          return;
        }
        const data = (await res.json()) as { lat: number; lng: number };
        if (!ctrl.signal.aborted) {
          setLatitude(data.lat);
          setLongitude(data.lng);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setGeocodeError("Geocoding failed — drop a pin manually.");
        }
      }
    }, 600);
  }, [addressStreet, addressCity, addressCountry]);

  function handlePinDrag(nLat: number, nLng: number) {
    geocodeAbortRef.current?.abort();
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    setLatitude(nLat);
    setLongitude(nLng);
  }

  const canCreate =
    name.trim().length > 0 &&
    !!category &&
    !!subcategory &&
    latitude != null &&
    longitude != null;
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [editCurrency, setEditCurrency] = useState("");
  const [editDeliveryFee, setEditDeliveryFee] = useState(0);
  const [editPayoutWallet, setEditPayoutWallet] = useState("");
  const [editAutoAcknowledge, setEditAutoAcknowledge] = useState(false);
  const [editSelfDelivery, setEditSelfDelivery] = useState(false);
  const [editAddressStreet, setEditAddressStreet] = useState("");
  const [editAddressCity, setEditAddressCity] = useState("");
  const [editAddressCountry, setEditAddressCountry] = useState("");
  const [editVendorType, setEditVendorType] = useState<VendorType>("restaurant");
  const [editPickupOnly, setEditPickupOnly] = useState(false);
  const [editPickupOnlyTouched, setEditPickupOnlyTouched] = useState(false);
  const [editCategory, setEditCategory] = useState("Food & Beverage");
  const [editSubcategory, setEditSubcategory] = useState("Restaurants & fast food");
  const [editLatitude, setEditLatitude] = useState<number | null>(null);
  const [editLongitude, setEditLongitude] = useState<number | null>(null);
  const [editGeocodeError, setEditGeocodeError] = useState<string | null>(null);
  const editGeocodeAbortRef = useRef<AbortController | null>(null);
  const editGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);

  function handleEditVendorTypeChange(next: VendorType) {
    setEditVendorType(next);
    if (next === "home_cook" && !editPickupOnlyTouched) {
      setEditPickupOnly(true);
    }
  }

  function triggerEditGeocode() {
    if (editGeocodeTimerRef.current) clearTimeout(editGeocodeTimerRef.current);
    editGeocodeTimerRef.current = setTimeout(async () => {
      const parts = [editAddressStreet, editAddressCity, editAddressCountry]
        .map((p) => p.trim())
        .filter((p) => p !== "");
      if (parts.length < 2) return;
      const q = parts.join(", ");
      editGeocodeAbortRef.current?.abort();
      const ctrl = new AbortController();
      editGeocodeAbortRef.current = ctrl;
      setEditGeocodeError(null);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (res.status === 404) {
          setEditGeocodeError("We couldn't find that address — drop a pin manually.");
          return;
        }
        if (!res.ok) {
          setEditGeocodeError("Geocoding is busy — drop a pin manually or try again in a minute.");
          return;
        }
        const data = (await res.json()) as { lat: number; lng: number };
        if (!ctrl.signal.aborted) {
          setEditLatitude(data.lat);
          setEditLongitude(data.lng);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setEditGeocodeError("Geocoding failed — drop a pin manually.");
        }
      }
    }, 600);
  }

  function handleEditPinDrag(nLat: number, nLng: number) {
    editGeocodeAbortRef.current?.abort();
    if (editGeocodeTimerRef.current) clearTimeout(editGeocodeTimerRef.current);
    setEditLatitude(nLat);
    setEditLongitude(nLng);
  }

  const merchant = selectedRestaurant;

  const setMerchant = (r: Merchant) => {
    setSelectedRestaurant(r);
    setMerchants((prev) => {
      const idx = prev.findIndex((p) => p.id === r.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = r;
        return next;
      }
      return [...prev, r];
    });
  };

  const loadRestaurants = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/merchants/mine", {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        clearToken();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const list: Merchant[] = data.merchants || (data.merchant ? [data.merchant] : []);
        setMerchants(list);
        if (list.length > 0) {
          setSelectedRestaurant((prev) => {
            if (prev) {
              const stillExists = list.find((r) => r.id === prev.id);
              return stillExists || list[0];
            }
            return list[0];
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, getAuthHeaders, clearToken]);

  useEffect(() => {
    if (token) loadRestaurants();
    else setLoading(false);
  }, [token, loadRestaurants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/merchants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          vendorType,
          pickupOnly,
          category,
          subcategory,
          addressStreet: addressStreet.trim() || null,
          addressCity: addressCity.trim() || null,
          addressCountry: addressCountry.trim() || null,
          latitude,
          longitude,
        }),
      });

      if (res.ok || res.status === 201) {
        const data = await res.json();
        setMerchants((prev) => [...prev, data]);
        setSelectedRestaurant(data);
        setShowCreateForm(false);
        setName("");
        setDescription("");
        setAddressStreet("");
        setAddressCity("");
        setAddressCountry("");
      } else if (res.status === 401) {
        clearToken();
      } else if (res.status === 409) {
        const { merchant: existing } = await res.json();
        setMerchant(existing);
        setShowCreateForm(false);
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
        {authError && (
          <p className="mt-4 text-sm text-red-600 max-w-md bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {authError}
          </p>
        )}
        <button
          onClick={authenticate}
          disabled={isAuthenticating}
          className="mt-8 btn-primary text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAuthenticating ? "Signing..." : t("signContinue")}
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

  // No merchants yet or showing create form
  if (merchants.length === 0 || showCreateForm) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        {merchants.length > 0 && (
          <button
            onClick={() => setShowCreateForm(false)}
            className="mb-4 text-sm text-gray-500 hover:text-forkit-orange transition-colors flex items-center gap-1"
          >
            ← {t("cancel")}
          </button>
        )}
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
              {t("merchantNameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("merchantNamePlaceholder")}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Vendor type
            </label>
            <VendorTypeRadios value={vendorType} onChange={handleVendorTypeChange} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <CategoryCascade
              category={category}
              subcategory={subcategory}
              onChange={({ category: c, subcategory: s }) => {
                setCategory(c);
                setSubcategory(s);
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t("streetAddressLabel")}
            </label>
            <input
              type="text"
              value={addressStreet}
              onChange={(e) => setAddressStreet(e.target.value)}
              placeholder={t("streetAddressPlaceholder")}
              autoComplete="street-address"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("cityLabel")}
              </label>
              <input
                type="text"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                placeholder={t("cityPlaceholder")}
                autoComplete="address-level2"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t("countryLabel")}
              </label>
              <input
                type="text"
                value={addressCountry}
                onChange={(e) => setAddressCountry(e.target.value)}
                onBlur={triggerGeocode}
                placeholder={t("countryPlaceholder")}
                autoComplete="country-name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Pickup location
            </label>
            <LocationMap lat={latitude} lng={longitude} onChange={handlePinDrag} />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-gray-500">
                {latitude != null && longitude != null
                  ? `lat ${latitude.toFixed(5)}, lng ${longitude.toFixed(5)}`
                  : "Click on the map or fill the address fields to drop a pin."}
              </span>
              {geocodeError && <span className="text-red-600">{geocodeError}</span>}
            </div>
          </div>

          <button
            type="submit"
            disabled={creating || !canCreate}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? t("creating") : t("createButton")}
          </button>
        </form>
      </div>
    );
  }

  // Has merchants — show dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Merchant selector — shown when multiple merchants */}
      {merchants.length > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {t("yourRestaurants")}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {merchants.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRestaurant(r);
                  setEditing(false);
                  setEditingSettings(false);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedRestaurant?.id === r.id
                    ? "bg-forkit-orange text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {r.logo ? (
                  <span className="inline-flex items-center gap-2">
                    <Image src={r.logo} alt="" width={20} height={20} className="rounded object-cover" />
                    {r.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    🍴 {r.name}
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-forkit-orange hover:text-forkit-orange transition-all"
            >
              + {t("createAnother")}
            </button>
          </div>
        </div>
      )}

      {merchant && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              {merchant.logo ? (
                <Image
                  src={merchant.logo}
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
                      if (!editName.trim() || !merchant) return;
                      setSaving(true);
                      try {
                        const res = await fetch(`/api/merchants/${merchant.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                          body: JSON.stringify({ name: editName.trim() }),
                        });
                        if (res.ok) {
                          const updated = await res.json();
                          setMerchant(updated);
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
                      {merchant.name}
                    </h1>
                    <button
                      onClick={() => { setEditName(merchant.name); setEditing(true); }}
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
                      merchant.published ? "bg-forkit-green" : "bg-yellow-400"
                    }`}
                  />
                  <span className="text-sm text-gray-500">
                    {merchant.published ? t("published") : t("draft")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {merchants.length <= 1 && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-secondary text-sm"
                >
                  + {t("createAnother")}
                </button>
              )}
              {merchant.published && (
                <Link
                  href={`/merchants/${merchant.slug}`}
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
              href={`/dashboard/menu?merchantId=${merchant.id}`}
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
              href={`/dashboard/template?merchantId=${merchant.id}`}
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
              href={`/dashboard/orders?merchantId=${merchant.id}`}
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
                      setEditCurrency(merchant.currency);
                      setEditDeliveryFee(merchant.deliveryFee);
                      setEditPayoutWallet(merchant.payoutWallet || merchant.wallet);
                      setEditAutoAcknowledge(merchant.autoAcknowledge);
                      setEditSelfDelivery(merchant.selfDelivery);
                      setEditAddressStreet(merchant.addressStreet || "");
                      setEditAddressCity(merchant.addressCity || "");
                      setEditAddressCountry(merchant.addressCountry || "");
                      setEditVendorType((merchant.vendorType as VendorType) || "restaurant");
                      setEditPickupOnly(merchant.pickupOnly ?? false);
                      setEditPickupOnlyTouched(true);
                      setEditCategory(merchant.category || "Food & Beverage");
                      setEditSubcategory(merchant.subcategory || "Restaurants & fast food");
                      setEditLatitude(merchant.latitude);
                      setEditLongitude(merchant.longitude);
                      setEditGeocodeError(null);
                      setSettingsSaveError(null);
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
                    <label className="block text-sm text-gray-700 font-medium mb-2">Vendor type</label>
                    <VendorTypeRadios value={editVendorType} onChange={handleEditVendorTypeChange} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-2">Category</label>
                    <CategoryCascade
                      category={editCategory}
                      subcategory={editSubcategory}
                      onChange={({ category: c, subcategory: s }) => {
                        setEditCategory(c);
                        setEditSubcategory(s);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm text-gray-700 font-medium">Pickup only</label>
                      <p className="text-xs text-gray-400 mt-0.5">Disables delivery; customers must pick up.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEditPickupOnly((v) => !v); setEditPickupOnlyTouched(true); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editPickupOnly ? "bg-forkit-orange" : "bg-gray-200"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        editPickupOnly ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">{t("currency")}</label>
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                    >
                      <option value="USDC">USDC</option>
                      <option value="EURC">EURC</option>
                      <option value="PYUSD">PYUSD</option>
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
                    {editSelfDelivery && (
                      <p className="mt-1 text-xs text-gray-400">{t("deliveryFeeOwnHint")}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">{t("payoutWallet")}</label>
                    <input
                      type="text"
                      value={editPayoutWallet}
                      onChange={(e) => setEditPayoutWallet(e.target.value)}
                      placeholder={merchant.wallet}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                    />
                    <p className="mt-1 text-xs text-gray-400">{t("payoutWalletHint")}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm text-gray-700 font-medium">{t("selfDeliveryLabel")}</label>
                      <p className="text-xs text-gray-400 mt-0.5">{t("selfDeliveryHint")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditSelfDelivery((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editSelfDelivery ? "bg-forkit-orange" : "bg-gray-200"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        editSelfDelivery ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm text-gray-700 font-medium">{t("autoAcknowledgeLabel")}</label>
                      <p className="text-xs text-gray-400 mt-0.5">{t("autoAcknowledgeHint")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditAutoAcknowledge((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editAutoAcknowledge ? "bg-forkit-orange" : "bg-gray-200"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        editAutoAcknowledge ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">{t("streetAddressLabel")}</label>
                    <input
                      type="text"
                      value={editAddressStreet}
                      onChange={(e) => setEditAddressStreet(e.target.value)}
                      placeholder={t("streetAddressPlaceholder")}
                      autoComplete="street-address"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">{t("cityLabel")}</label>
                      <input
                        type="text"
                        value={editAddressCity}
                        onChange={(e) => setEditAddressCity(e.target.value)}
                        placeholder={t("cityPlaceholder")}
                        autoComplete="address-level2"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">{t("countryLabel")}</label>
                      <input
                        type="text"
                        value={editAddressCountry}
                        onChange={(e) => setEditAddressCountry(e.target.value)}
                        onBlur={triggerEditGeocode}
                        placeholder={t("countryPlaceholder")}
                        autoComplete="country-name"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-2">Pickup location</label>
                    <LocationMap lat={editLatitude} lng={editLongitude} onChange={handleEditPinDrag} />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {editLatitude != null && editLongitude != null
                          ? `lat ${editLatitude.toFixed(5)}, lng ${editLongitude.toFixed(5)}`
                          : "Click on the map or fill the address fields to drop a pin."}
                      </span>
                      {editGeocodeError && <span className="text-red-600">{editGeocodeError}</span>}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t("slug")}</span>
                    <span className="font-mono text-xs">{merchant.slug}</span>
                  </div>
                  {settingsSaveError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {settingsSaveError}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={async () => {
                        if (!merchant) return;
                        setSavingSettings(true);
                        setSettingsSaveError(null);
                        try {
                          const res = await fetch(`/api/merchants/${merchant.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                            body: JSON.stringify({
                              currency: editCurrency,
                              deliveryFee: editDeliveryFee,
                              payoutWallet: editPayoutWallet,
                              autoAcknowledge: editAutoAcknowledge,
                              selfDelivery: editSelfDelivery,
                              addressStreet: editAddressStreet || null,
                              addressCity: editAddressCity || null,
                              addressCountry: editAddressCountry || null,
                              vendorType: editVendorType,
                              pickupOnly: editPickupOnly,
                              category: editCategory,
                              subcategory: editSubcategory,
                              latitude: editLatitude,
                              longitude: editLongitude,
                            }),
                          });
                          if (res.ok) {
                            const updated = await res.json();
                            setMerchant(updated);
                            setEditingSettings(false);
                          } else if (res.status === 401) {
                            clearToken();
                          } else {
                            const data = await res.json().catch(() => ({}));
                            setSettingsSaveError(data.error || `Save failed (${res.status})`);
                          }
                        } catch (err) {
                          console.error(err);
                          setSettingsSaveError("Network error — please try again");
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
                      onClick={() => { setEditingSettings(false); setSettingsSaveError(null); }}
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
                    <span className="font-medium">{merchant.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t("deliveryFee")}</span>
                    <span className="font-medium">
                      {merchant.deliveryFee.toFixed(2)} {merchant.currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t("payoutWallet")}</span>
                    <span className="font-mono text-xs truncate max-w-[140px]" title={merchant.payoutWallet || merchant.wallet}>
                      {(merchant.payoutWallet || merchant.wallet).slice(0, 8)}...{(merchant.payoutWallet || merchant.wallet).slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t("selfDeliveryLabel")}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${merchant.selfDelivery ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"}`}>
                      {merchant.selfDelivery ? t("on") : t("off")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t("autoAcknowledgeLabel")}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${merchant.autoAcknowledge ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {merchant.autoAcknowledge ? t("on") : t("off")}
                    </span>
                  </div>
                  {(merchant.addressStreet || merchant.addressCity || merchant.addressCountry) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t("addressLabel")}</span>
                      <span className="text-xs text-right max-w-[160px]">
                        {[merchant.addressStreet, merchant.addressCity, merchant.addressCountry].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t("slug")}</span>
                    <span className="font-mono text-xs">{merchant.slug}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
