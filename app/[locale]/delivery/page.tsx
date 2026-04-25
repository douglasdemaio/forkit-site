"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletAuth } from "@/hooks/useWallet";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { OrderStatus } from "@/lib/types";

interface OrderItem {
  name?: string;
  menuItemId?: string;
  quantity: number;
  price?: number;
}

interface DeliveryOrder {
  id: string;
  customer: { wallet: string };
  restaurant?: { id: string; name: string; slug: string; wallet: string; currency: string };
  items: OrderItem[];
  foodTotal: number;
  deliveryFee: number;
  status: OrderStatus;
  driverWallet: string | null;
  deliveryAddress: string | null;
  bidOpenAt: string | null;
  myBidStatus?: "Pending" | "Accepted" | "Rejected" | "Expired" | null;
  createdAt: string;
}

const statusBadge: Partial<Record<OrderStatus, string>> = {
  Preparing: "bg-purple-100 text-purple-800",
  DriverAssigned: "bg-violet-100 text-violet-800",
  ReadyForPickup: "bg-amber-100 text-amber-800",
  PickedUp: "bg-indigo-100 text-indigo-800",
  Delivered: "bg-teal-100 text-teal-800",
  Settled: "bg-gray-100 text-gray-800",
};

function shortWallet(w: string): string {
  if (!w || w.length < 8) return w;
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

function formatItems(items: OrderItem[] | string | undefined): string {
  const parsed = typeof items === "string" ? (JSON.parse(items) as OrderItem[]) : items ?? [];
  return parsed
    .map((i) => `${i.quantity}× ${i.name ?? i.menuItemId ?? "item"}`)
    .join(", ");
}

export default function DeliveryPage() {
  const { connected } = useWallet();
  const { wallet, token, authenticate, getAuthHeaders, isAuthenticating, authError } =
    useWalletAuth();
  const t = useTranslations("delivery");

  const [available, setAvailable] = useState<DeliveryOrder[]>([]);
  const [mine, setMine] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bidding, setBidding] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const headers = getAuthHeaders();
      const [availRes, mineRes] = await Promise.all([
        fetch("/api/orders/available", { headers }),
        fetch("/api/orders?role=driver", { headers }),
      ]);

      if (availRes.ok) {
        const body = await availRes.json();
        setAvailable(body.orders ?? []);
      }
      if (mineRes.ok) {
        const body = await mineRes.json();
        const all: DeliveryOrder[] = Array.isArray(body) ? body : body.orders ?? [];
        setMine(all.filter((o) => o.driverWallet && o.driverWallet === wallet));
      }
    } catch (e) {
      // network errors during polling are silent
      console.error("delivery fetch failed", e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [token, getAuthHeaders, wallet]);

  useEffect(() => {
    if (!token) return;
    fetchOrders();
    pollRef.current = setInterval(fetchOrders, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, fetchOrders]);

  const placeBid = async (orderId: string) => {
    setBidding(orderId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/bids`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to bid");
      setNotice(body.autoAssigned ? t("autoAssigned") : t("bidPlaced"));
      await fetchOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to bid");
    } finally {
      setBidding(null);
    }
  };

  const verifyCode = async (orderId: string, kind: "pickup" | "delivery") => {
    const code = codeInput[orderId]?.trim();
    if (!code) {
      setError("Enter the code first");
      return;
    }
    setVerifying(orderId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/verify-${kind}`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.valid === false) {
        throw new Error(body.error || "Invalid code");
      }
      setNotice(kind === "pickup" ? "Pickup confirmed" : "Delivery confirmed — funds released");
      setCodeInput((s) => ({ ...s, [orderId]: "" }));
      await fetchOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code verification failed");
    } finally {
      setVerifying(null);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-forkit-dark mb-2">{t("title")}</h1>
        <p className="text-gray-600 mb-8">{t("subtitle")}</p>
        <WalletMultiButton />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-forkit-dark mb-2">{t("title")}</h1>
        <p className="text-gray-600 mb-6">{t("authRequired")}</p>
        <button
          type="button"
          onClick={() => authenticate()}
          disabled={isAuthenticating}
          className="px-6 py-3 bg-forkit-orange text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          {isAuthenticating ? "Signing…" : t("signContinue")}
        </button>
        {authError && <p className="text-red-600 mt-4 text-sm">{authError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-forkit-dark">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          disabled={refreshing}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          {refreshing ? t("refreshing") : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
          {notice}
        </div>
      )}

      {/* My active deliveries */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-forkit-dark mb-4">My active deliveries</h2>
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : mine.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-sm">
            You have no active deliveries. Bid on an open order below to claim one.
          </div>
        ) : (
          <ul className="space-y-3">
            {mine.map((o) => (
              <li
                key={o.id}
                className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold text-forkit-dark">
                      {o.restaurant?.name ?? "Restaurant"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Order #{o.id.slice(0, 8)} · {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                      statusBadge[o.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <div className="text-gray-500 text-xs">{t("items")}</div>
                    <div className="text-gray-800">{formatItems(o.items)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">{t("deliverTo")}</div>
                    <div className="text-gray-800">{o.deliveryAddress || "—"}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                  <span className="text-gray-600">
                    {t("deliveryFee")}:{" "}
                    <span className="font-semibold text-forkit-dark">
                      {o.deliveryFee} {o.restaurant?.currency ?? "USDC"}
                    </span>
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">
                    Customer: <span className="font-mono">{shortWallet(o.customer.wallet)}</span>
                  </span>
                </div>

                {o.status === "ReadyForPickup" && (
                  <div className="pt-3 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Enter pickup code (Code A) from the restaurant
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codeInput[o.id] ?? ""}
                        onChange={(e) =>
                          setCodeInput((s) => ({ ...s, [o.id]: e.target.value }))
                        }
                        placeholder="ABCDEF"
                        maxLength={12}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-forkit-orange"
                      />
                      <button
                        type="button"
                        onClick={() => verifyCode(o.id, "pickup")}
                        disabled={verifying === o.id}
                        className="px-4 py-2 bg-forkit-orange text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                      >
                        {verifying === o.id ? "Verifying…" : "Confirm pickup"}
                      </button>
                    </div>
                  </div>
                )}

                {o.status === "PickedUp" && (
                  <div className="pt-3 border-t border-gray-100">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Enter delivery code (Code B) shown by the customer
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codeInput[o.id] ?? ""}
                        onChange={(e) =>
                          setCodeInput((s) => ({ ...s, [o.id]: e.target.value }))
                        }
                        placeholder="ABCDEF"
                        maxLength={12}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-forkit-orange"
                      />
                      <button
                        type="button"
                        onClick={() => verifyCode(o.id, "delivery")}
                        disabled={verifying === o.id}
                        className="px-4 py-2 bg-forkit-orange text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                      >
                        {verifying === o.id ? "Verifying…" : "Confirm delivery"}
                      </button>
                    </div>
                  </div>
                )}

                {(o.status === "DriverAssigned" || o.status === "Preparing") && (
                  <div className="pt-3 border-t border-gray-100 text-sm text-gray-500">
                    Waiting for the restaurant to mark the order ready for pickup.
                  </div>
                )}

                <div className="mt-3">
                  <Link
                    href={`/order/${o.id}`}
                    className="text-xs text-forkit-orange hover:underline"
                  >
                    View full order →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Available bidding pool */}
      <section>
        <h2 className="text-xl font-semibold text-forkit-dark mb-4">Open for bidding</h2>
        {loading ? (
          <div className="text-gray-500">Loading…</div>
        ) : available.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-gray-200 text-center">
            <div className="text-3xl mb-2">🍴</div>
            <div className="font-medium text-forkit-dark">{t("noOrders")}</div>
            <div className="text-sm text-gray-500 mt-1">{t("noOrdersDesc")}</div>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {available.map((o) => (
              <li
                key={o.id}
                className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold text-forkit-dark">
                      {o.restaurant?.name ?? "Restaurant"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Opened {o.bidOpenAt ? new Date(o.bidOpenAt).toLocaleTimeString() : "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{t("deliveryFee")}</div>
                    <div className="text-lg font-semibold text-forkit-dark">
                      {o.deliveryFee} {o.restaurant?.currency ?? "USDC"}
                    </div>
                  </div>
                </div>

                <div className="text-sm mb-2">
                  <div className="text-gray-500 text-xs">{t("items")}</div>
                  <div className="text-gray-800 line-clamp-2">{formatItems(o.items)}</div>
                </div>

                <div className="text-sm mb-4">
                  <div className="text-gray-500 text-xs">{t("deliverTo")}</div>
                  <div className="text-gray-800">{o.deliveryAddress || "—"}</div>
                </div>

                <button
                  type="button"
                  onClick={() => placeBid(o.id)}
                  disabled={bidding === o.id || o.myBidStatus === "Pending"}
                  className="w-full px-4 py-2 bg-forkit-orange text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                >
                  {bidding === o.id
                    ? t("bidding")
                    : o.myBidStatus === "Pending"
                      ? t("bidPlaced")
                      : t("bid")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
