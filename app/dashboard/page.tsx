"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletAuth } from "@/hooks/useWallet";
import Link from "next/link";
import Image from "next/image";

interface Restaurant {
  id: string;
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
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadRestaurant = useCallback(async () => {
    if (!token) return;
    try {
      // Try to find existing restaurant for this wallet
      const res = await fetch("/api/restaurants", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      // Find restaurant matching our wallet from published + unpublished
      // We need a different endpoint for this, so let's try creating
      // and handle the 409 conflict
      const createRes = await fetch("/api/restaurants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name: "__probe__" }),
      });
      if (createRes.status === 409) {
        const { restaurant: existing } = await createRes.json();
        setRestaurant(existing);
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
          Connect your wallet
        </h1>
        <p className="mt-3 text-gray-500 max-w-md">
          Connect your Solana wallet to create and manage your restaurant page.
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
          Sign to authenticate
        </h1>
        <p className="mt-3 text-gray-500 max-w-md">
          Sign a message with your wallet to prove ownership and access your dashboard.
        </p>
        <button
          onClick={authenticate}
          className="mt-8 btn-primary text-lg"
        >
          Sign & Continue
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
            Create your restaurant
          </h1>
          <p className="mt-2 text-gray-500">
            Set up your restaurant page in just a few steps
          </p>
        </div>

        <form onSubmit={handleCreate} className="card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Restaurant Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mario's Pizzeria"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell customers about your restaurant..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create Restaurant"}
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
            <h1 className="text-2xl font-bold text-forkit-dark">
              {restaurant.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  restaurant.published ? "bg-forkit-green" : "bg-yellow-400"
                }`}
              />
              <span className="text-sm text-gray-500">
                {restaurant.published ? "Published" : "Draft"}
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
              View Live Page ↗
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
            Menu Editor
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Add items, set prices, upload photos
          </p>
        </Link>

        <Link
          href="/dashboard/template"
          className="card p-6 hover:border-forkit-orange/30 transition-colors group"
        >
          <div className="text-3xl mb-3">🎨</div>
          <h3 className="font-bold text-gray-900 group-hover:text-forkit-orange transition-colors">
            Template
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Choose your restaurant&apos;s look
          </p>
        </Link>

        <Link
          href="/dashboard/orders"
          className="card p-6 hover:border-forkit-orange/30 transition-colors group"
        >
          <div className="text-3xl mb-3">📦</div>
          <h3 className="font-bold text-gray-900 group-hover:text-forkit-orange transition-colors">
            Orders
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            View and manage incoming orders
          </p>
        </Link>

        <div className="card p-6">
          <div className="text-3xl mb-3">⚙️</div>
          <h3 className="font-bold text-gray-900">Settings</h3>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Currency</span>
              <span className="font-medium">{restaurant.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery fee</span>
              <span className="font-medium">
                {restaurant.deliveryFee.toFixed(2)} {restaurant.currency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Slug</span>
              <span className="font-mono text-xs">{restaurant.slug}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
