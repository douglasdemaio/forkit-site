"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletAuth } from "@/hooks/useWallet";
import { useSearchParams } from "next/navigation";
import { templates } from "@/lib/templates";
import TemplatePreview from "@/components/template-preview";
import ImageUpload from "@/components/image-upload";

export default function TemplatePage() {
  const { connected } = useWallet();
  const { token, getAuthHeaders, authenticate } = useWalletAuth();
  const searchParams = useSearchParams();
  const restaurantIdParam = searchParams.get("restaurantId");
  const [restaurantId, setRestaurantId] = useState<string | null>(restaurantIdParam);
  const [selectedTemplate, setSelectedTemplate] = useState("classic-bistro");
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/restaurants/mine", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const restaurants = data.restaurants || (data.restaurant ? [data.restaurant] : []);
        const restaurant = restaurantIdParam
          ? restaurants.find((r: any) => r.id === restaurantIdParam) || restaurants[0]
          : restaurants[0];
        if (restaurant) {
          setRestaurantId(restaurant.id);
          setSelectedTemplate(restaurant.template);
          setLogo(restaurant.logo);
          setBanner(restaurant.banner);
          setPublished(restaurant.published);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, getAuthHeaders, restaurantIdParam]);

  useEffect(() => {
    if (token) loadData();
    else setLoading(false);
  }, [token, loadData]);

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      await fetch(`/api/restaurants/${restaurantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          template: selectedTemplate,
          logo,
          banner,
          published,
        }),
      });
      alert("Settings saved!");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!connected || !token) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <span className="text-5xl mb-4">🔐</span>
        <h1 className="text-2xl font-bold">Authentication required</h1>
        {connected && !token && (
          <button onClick={authenticate} className="mt-4 btn-primary">
            Sign & Continue
          </button>
        )}
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-forkit-dark">
            Template & Branding
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Customize how your restaurant page looks
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Choose a template
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((t) => (
            <TemplatePreview
              key={t.id}
              template={t}
              selected={selectedTemplate === t.id}
              onSelect={setSelectedTemplate}
            />
          ))}
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
        <div className="card p-6 flex flex-col sm:flex-row gap-8">
          <ImageUpload
            currentImage={logo}
            onUpload={setLogo}
            label="Logo"
            aspectRatio="square"
          />
          <ImageUpload
            currentImage={banner}
            onUpload={setBanner}
            label="Banner Image"
            aspectRatio="banner"
            className="flex-1"
          />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Publish your restaurant
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              When published, your restaurant will appear in the directory and
              customers can place orders.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forkit-orange" />
          </label>
        </div>
      </div>
    </div>
  );
}
