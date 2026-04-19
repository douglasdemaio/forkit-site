"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletAuth } from "@/hooks/useWallet";
import { useSearchParams } from "next/navigation";
import { templates } from "@/lib/templates";
import TemplatePreview from "@/components/template-preview";
import ImageUpload from "@/components/image-upload";
import { FONTS, getFont } from "@/lib/fonts";

// Preset palettes to help owners pick good-looking combinations
const PALETTE_PRESETS = [
  { name: "Warm Classic", primary: "#f9a825", secondary: "#0d1421", accent: "#ffffff" },
  { name: "Forest & Cream", primary: "#2d5016", secondary: "#f5efe0", accent: "#c9a96e" },
  { name: "Ocean Blue", primary: "#1e6091", secondary: "#ffffff", accent: "#f4a261" },
  { name: "Rose Gold", primary: "#c9184a", secondary: "#fff0f3", accent: "#590d22" },
  { name: "Minimal Mono", primary: "#111111", secondary: "#ffffff", accent: "#dddddd" },
  { name: "Sunset", primary: "#f77f00", secondary: "#003049", accent: "#fcbf49" },
  { name: "Matcha", primary: "#6a994e", secondary: "#f2e8cf", accent: "#386641" },
  { name: "Midnight Wine", primary: "#8e001c", secondary: "#1a1a1a", accent: "#c99999" },
];

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
  const [colorPrimary, setColorPrimary] = useState<string>("#f9a825");
  const [colorSecondary, setColorSecondary] = useState<string>("#0d1421");
  const [colorAccent, setColorAccent] = useState<string>("#ffffff");
  const [fontFamily, setFontFamily] = useState<string>("Inter");

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
          if (restaurant.colorPrimary) setColorPrimary(restaurant.colorPrimary);
          if (restaurant.colorSecondary) setColorSecondary(restaurant.colorSecondary);
          if (restaurant.colorAccent) setColorAccent(restaurant.colorAccent);
          if (restaurant.fontFamily) setFontFamily(restaurant.fontFamily);
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
          colorPrimary,
          colorSecondary,
          colorAccent,
          fontFamily,
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

      {/* Custom Colors */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Colors</h2>
        <div className="card p-6">
          <p className="text-sm text-gray-500 mb-4">
            Pick a preset palette or choose custom hex colors. These override the template defaults on your public page.
          </p>

          {/* Palette presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick palette
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PALETTE_PRESETS.map((p) => {
                const active =
                  p.primary.toLowerCase() === colorPrimary.toLowerCase() &&
                  p.secondary.toLowerCase() === colorSecondary.toLowerCase() &&
                  p.accent.toLowerCase() === colorAccent.toLowerCase();
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setColorPrimary(p.primary);
                      setColorSecondary(p.secondary);
                      setColorAccent(p.accent);
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${
                      active
                        ? "border-forkit-orange bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      <div
                        className="w-6 h-6 rounded-full border border-gray-200"
                        style={{ backgroundColor: p.primary }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border border-gray-200"
                        style={{ backgroundColor: p.secondary }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border border-gray-200"
                        style={{ backgroundColor: p.accent }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual color pickers */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Primary", value: colorPrimary, set: setColorPrimary, hint: "Buttons & headings" },
              { label: "Secondary", value: colorSecondary, set: setColorSecondary, hint: "Backgrounds" },
              { label: "Accent", value: colorAccent, set: setColorAccent, hint: "Text & details" },
            ].map((c) => (
              <div key={c.label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {c.label}{" "}
                  <span className="text-xs text-gray-400 font-normal">({c.hint})</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={c.value}
                    onChange={(e) => c.set(e.target.value)}
                    className="h-10 w-12 rounded-lg border border-gray-200 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={c.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === "") c.set(v);
                    }}
                    placeholder="#ffffff"
                    maxLength={7}
                    className="flex-1 px-3 py-2 border rounded-lg font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Live preview */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div
              className="rounded-xl p-6 border"
              style={{
                backgroundColor: colorSecondary,
                color: colorAccent,
                fontFamily: getFont(fontFamily)?.stack || "system-ui",
              }}
            >
              <h3 className="text-2xl font-bold mb-2" style={{ color: colorPrimary }}>
                Your Restaurant Name
              </h3>
              <p className="mb-4 opacity-80">
                Fresh, locally-sourced dishes delivered with care.
              </p>
              <button
                type="button"
                className="px-5 py-2 rounded-lg font-semibold"
                style={{ backgroundColor: colorPrimary, color: colorSecondary }}
              >
                View Menu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Font */}
      <div className="mb-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Font</h2>
        <div className="card p-6">
          <p className="text-sm text-gray-500 mb-4">
            Choose a typeface for your restaurant page. All fonts are open-source (Google Fonts).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {FONTS.map((f) => {
              const active = f.name === fontFamily;
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setFontFamily(f.name)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors ${
                    active
                      ? "border-forkit-orange bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className="text-xl font-bold mb-1"
                    style={{ fontFamily: f.stack }}
                  >
                    {f.name}
                  </div>
                  <div className="text-xs text-gray-400 capitalize">{f.category}</div>
                </button>
              );
            })}
          </div>
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
