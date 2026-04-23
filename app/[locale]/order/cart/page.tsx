"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/wallet-button";
import { useCart } from "@/hooks/useCart";
import { useEscrow } from "@/hooks/useEscrow";
import { useWalletAuth } from "@/hooks/useWallet";
import { useTranslations } from "next-intl";

// Map IANA timezone to country name — independent of UI language.
function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const map: Record<string, string> = {
      "America/New_York": "United States",
      "America/Chicago": "United States",
      "America/Denver": "United States",
      "America/Los_Angeles": "United States",
      "America/Phoenix": "United States",
      "America/Anchorage": "United States",
      "Pacific/Honolulu": "United States",
      "America/Toronto": "Canada",
      "America/Vancouver": "Canada",
      "America/Sao_Paulo": "Brazil",
      "America/Mexico_City": "Mexico",
      "America/Buenos_Aires": "Argentina",
      "America/Bogota": "Colombia",
      "America/Lima": "Peru",
      "America/Santiago": "Chile",
      "Europe/London": "United Kingdom",
      "Europe/Berlin": "Germany",
      "Europe/Paris": "France",
      "Europe/Madrid": "Spain",
      "Europe/Rome": "Italy",
      "Europe/Amsterdam": "Netherlands",
      "Europe/Brussels": "Belgium",
      "Europe/Zurich": "Switzerland",
      "Europe/Vienna": "Austria",
      "Europe/Warsaw": "Poland",
      "Europe/Prague": "Czech Republic",
      "Europe/Stockholm": "Sweden",
      "Europe/Copenhagen": "Denmark",
      "Europe/Helsinki": "Finland",
      "Europe/Oslo": "Norway",
      "Europe/Lisbon": "Portugal",
      "Europe/Athens": "Greece",
      "Europe/Istanbul": "Turkey",
      "Europe/Moscow": "Russia",
      "Europe/Kyiv": "Ukraine",
      "Asia/Tokyo": "Japan",
      "Asia/Seoul": "South Korea",
      "Asia/Shanghai": "China",
      "Asia/Hong_Kong": "Hong Kong",
      "Asia/Singapore": "Singapore",
      "Asia/Taipei": "Taiwan",
      "Asia/Bangkok": "Thailand",
      "Asia/Jakarta": "Indonesia",
      "Asia/Manila": "Philippines",
      "Asia/Kolkata": "India",
      "Asia/Dubai": "United Arab Emirates",
      "Asia/Riyadh": "Saudi Arabia",
      "Asia/Jerusalem": "Israel",
      "Asia/Tel_Aviv": "Israel",
      "Australia/Sydney": "Australia",
      "Australia/Melbourne": "Australia",
      "Pacific/Auckland": "New Zealand",
      "Africa/Johannesburg": "South Africa",
      "Africa/Lagos": "Nigeria",
      "Africa/Cairo": "Egypt",
    };
    return map[tz] ?? "";
  } catch {
    return "";
  }
}

export default function CartPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { token, authenticate, getAuthHeaders, isAuthenticating } = useWalletAuth();
  const t = useTranslations("cart");
  const {
    items,
    total,
    restaurantId,
    restaurantSlug,
    restaurantName,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const { createOrder } = useEscrow();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fulfillment mode
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">("delivery");

  // Address fields
  const [streetAddress, setStreetAddress] = useState("");
  const [apartment, setApartment] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    const detected = detectCountry();
    if (detected) setCountry(detected);
  }, []);

  const deliveryFee = 0; // fetched from restaurant in production
  const effectiveDeliveryFee = deliveryMode === "pickup" ? 0 : deliveryFee;
  const grandTotal = total + effectiveDeliveryFee;

  const fullDeliveryAddress = [
    streetAddress,
    apartment,
    city,
    zipCode && stateProvince
      ? `${zipCode} ${stateProvince}`
      : zipCode || stateProvince,
    country,
  ]
    .filter(Boolean)
    .join(", ");

  const addressReady =
    deliveryMode === "pickup" ||
    (streetAddress.trim().length > 0 && city.trim().length > 0);

  const handleCheckout = async () => {
    if (!connected || !publicKey || !restaurantId) return;

    setPlacing(true);
    setError(null);
    try {
      // Ensure we have a valid JWT before making authenticated API calls
      let authToken = token;
      if (!authToken) {
        authToken = await authenticate();
        if (!authToken) {
          throw new Error("Wallet authentication required to place an order");
        }
      }
      const authHeaders = { Authorization: `Bearer ${authToken}` };

      // 1. Create order in database
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          restaurantId,
          items: items.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
          })),
          deliveryAddress: deliveryMode === "pickup" ? null : fullDeliveryAddress,
          isPickup: deliveryMode === "pickup",
        }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json();
        throw new Error(data.error || "Failed to create order");
      }

      const order = await orderRes.json();

      // 2. Create on-chain escrow
      try {
        if (!order.restaurant?.walletAddress && !order.restaurant?.wallet) {
          throw new Error("Restaurant wallet address not found");
        }

        const { signature, orderPda } = await createOrder({
          orderId: order.id,
          restaurantWallet: order.restaurant.walletAddress || order.restaurant.wallet,
          foodAmount: order.foodTotal,
          deliveryAmount: order.deliveryFee,
          currency: order.restaurant.currency || "USDC",
          codeAHash: order.codeAHash || "",
          codeBHash: order.codeBHash || "",
        });

        // 3. Update order with on-chain info (store order PDA, not tx signature)
        await fetch(`/api/orders/${order.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            status: "Funded",
            onChainOrderId: orderPda,
          }),
        });

        // Record the customer's contribution
        await fetch(`/api/orders/${order.id}/contribute`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            contributorWallet: publicKey.toBase58(),
            amount: order.escrowTarget,
            txSignature: signature,
          }),
        });
      } catch (txErr) {
        // If on-chain tx fails, order remains pending (can be funded later)
        console.warn("On-chain tx failed, order saved as pending:", txErr);
      }

      clearCart();
      router.push(`/order/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <span className="text-6xl">🛒</span>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          {t("emptyCart")}
        </h1>
        <p className="mt-2 text-gray-500">{t("emptyCartDesc")}</p>
        <Link href="/restaurants" className="mt-6 btn-primary">
          {t("browseRestaurants")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-forkit-dark mb-2">
        {t("checkout")}
      </h1>
      {restaurantName && (
        <p className="text-gray-500 mb-8">
          {t("orderingFrom")}{" "}
          <Link
            href={`/restaurants/${restaurantSlug}`}
            className="text-forkit-orange hover:underline"
          >
            {restaurantName}
          </Link>
        </p>
      )}

      {/* Items */}
      <div className="card divide-y">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-gray-50"
                >
                  −
                </button>
                <span className="w-8 text-center font-medium">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-gray-50"
                >
                  +
                </button>
              </div>

              <span className="w-24 text-right font-semibold text-gray-900">
                {(item.price * item.quantity).toFixed(2)}
              </span>

              <button
                onClick={() => removeItem(item.id)}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Fulfillment mode toggle */}
      <div className="card mt-6 p-5">
        <p className="text-sm font-medium text-gray-700 mb-3">
          {t("fulfillmentMode")}
        </p>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setDeliveryMode("delivery")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              deliveryMode === "delivery"
                ? "bg-forkit-orange text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t("delivery")}
          </button>
          <button
            onClick={() => setDeliveryMode("pickup")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              deliveryMode === "pickup"
                ? "bg-forkit-orange text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t("pickup")}
          </button>
        </div>
        {deliveryMode === "pickup" && (
          <p className="mt-2 text-xs text-gray-400">{t("pickupHint")}</p>
        )}
      </div>

      {/* Delivery address — hidden when pickup selected */}
      {deliveryMode === "delivery" && (
        <div className="card mt-6 p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">
            {t("deliveryAddress")}
          </h2>

          {/* Street address */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {t("streetAddress")}
            </label>
            <input
              type="text"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder={t("streetAddressPlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
              required
              autoComplete="street-address"
            />
          </div>

          {/* Apartment */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {t("apartment")}
            </label>
            <input
              type="text"
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
              placeholder={t("apartmentPlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
              autoComplete="address-line2"
            />
          </div>

          {/* City / ZIP / State in a row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {t("city")}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("cityPlaceholder")}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                required
                autoComplete="address-level2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {t("zipCode")}
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder={t("zipCodePlaceholder")}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                autoComplete="postal-code"
              />
            </div>
          </div>

          {/* State / Province */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {t("stateProvince")}
            </label>
            <input
              type="text"
              value={stateProvince}
              onChange={(e) => setStateProvince(e.target.value)}
              placeholder={t("stateProvincePlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
              autoComplete="address-level1"
            />
          </div>

          {/* Country — auto-detected, always editable */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {t("country")}
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t("countryPlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
              autoComplete="country-name"
            />
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="card mt-6 p-5 space-y-3">
        <div className="flex justify-between text-sm text-gray-500">
          <span>{t("subtotal")}</span>
          <span>{total.toFixed(2)} USDC</span>
        </div>
        {effectiveDeliveryFee > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>{t("deliveryFee")}</span>
            <span>{effectiveDeliveryFee.toFixed(2)} USDC</span>
          </div>
        )}
        {deliveryMode === "pickup" && deliveryFee > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{t("pickupDiscount")}</span>
            <span>−{deliveryFee.toFixed(2)} USDC</span>
          </div>
        )}
        <div className="border-t pt-3 flex justify-between text-lg font-bold">
          <span>{t("total")}</span>
          <span className="text-forkit-orange">
            {grandTotal.toFixed(2)} USDC
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Checkout button */}
      <div className="mt-6">
        {!connected ? (
          <div className="text-center">
            <p className="text-gray-500 mb-4">{t("connectWalletToPay")}</p>
            <WalletButton className="!bg-forkit-orange hover:!bg-orange-600 !rounded-xl !h-12 !text-base !mx-auto" />
          </div>
        ) : (
          <button
            onClick={handleCheckout}
            disabled={placing || isAuthenticating || !addressReady}
            className="w-full py-4 bg-forkit-orange text-white rounded-xl font-semibold text-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {placing || isAuthenticating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isAuthenticating ? t("signing") : t("processing")}
              </span>
            ) : (
              t("payAmount", { amount: grandTotal.toFixed(2) })
            )}
          </button>
        )}
      </div>

      {/* Split payment info */}
      <p className="mt-4 text-center text-sm text-gray-400">
        💡 {t("splitHint")}
      </p>
    </div>
  );
}
