"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletAuth } from "@/hooks/useWallet";
import { useSearchParams } from "next/navigation";
import { MenuItemData } from "@/lib/types";
import ImageUpload from "@/components/image-upload";
import SortableMenuItem from "@/components/sortable-menu-item";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

interface FormData {
  id?: string;
  name: string;
  description: string;
  price: string;
  image: string | null;
  category: string;
  available: boolean;
}

const emptyForm: FormData = {
  name: "",
  description: "",
  price: "",
  image: null,
  category: "Main",
  available: true,
};

export default function MenuEditorPage() {
  const { connected } = useWallet();
  const { token, getAuthHeaders, authenticate } = useWalletAuth();
  const searchParams = useSearchParams();
  const restaurantIdParam = searchParams.get("restaurantId");
  const [restaurantId, setRestaurantId] = useState<string | null>(restaurantIdParam);
  const [restaurantSlug, setRestaurantSlug] = useState<string>("");
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [currency, setCurrency] = useState("USDC");
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setExpandedId(null);
    if (!over || active.id === over.id || !restaurantId) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    setOrderChanged(true);
  };

  const saveOrder = async () => {
    if (!restaurantId) return;
    setSavingOrder(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ orderedIds: items.map((i) => i.id) }),
      });
      if (res.ok) {
        setOrderChanged(false);
      } else {
        loadData();
      }
    } catch (err) {
      console.error(err);
      loadData();
    } finally {
      setSavingOrder(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/restaurants/mine", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const restaurants = data.restaurants || (data.restaurant ? [data.restaurant] : []);
        // Use URL param restaurant, or fall back to first
        const restaurant = restaurantIdParam
          ? restaurants.find((r: any) => r.id === restaurantIdParam) || restaurants[0]
          : restaurants[0];
        if (restaurant) {
          setRestaurantId(restaurant.id);
          setRestaurantSlug(restaurant.slug);
          setRestaurantName(restaurant.name);
          setCurrency(restaurant.currency);

          const menuRes = await fetch(`/api/restaurants/${restaurant.id}/menu`);
          if (menuRes.ok) {
            const menuData = await menuRes.json();
            setItems(menuData);
          }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !form.name || !form.price) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          ...(form.id ? { id: form.id } : {}),
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          image: form.image,
          category: form.category,
          available: form.available,
        }),
      });

      if (res.ok) {
        setForm(emptyForm);
        setShowForm(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: MenuItemData) => {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      image: item.image,
      category: item.category,
      available: item.available,
    });
    setShowForm(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!restaurantId || !confirm("Delete this menu item?")) return;

    try {
      await fetch(`/api/restaurants/${restaurantId}/menu?itemId=${itemId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!connected || !token) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <span className="text-5xl mb-4">🔐</span>
        <h1 className="text-2xl font-bold">Authentication required</h1>
        <p className="text-gray-500 mt-2">
          Connect and sign to manage your menu.
        </p>
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
          <h1 className="text-2xl font-bold text-forkit-dark">Menu Editor</h1>
          <p className="text-gray-500 text-sm mt-1">
            Add and manage your menu items
          </p>
        </div>
        <div className="flex items-center gap-2">
          {orderChanged && (
            <button
              onClick={saveOrder}
              disabled={savingOrder}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {savingOrder ? "Saving..." : "Save Order"}
            </button>
          )}
          <button
            onClick={() => {
              setForm(emptyForm);
              setShowForm(true);
            }}
          className="btn-primary text-sm"
          >
            + Add Item
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {form.id ? "Edit Item" : "Add Item"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Margherita Pizza"
                  className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Fresh mozzarella, basil, San Marzano tomatoes..."
                  rows={2}
                  className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="12.50"
                    className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    placeholder="Main, Appetizer, Dessert..."
                    className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
                  />
                </div>
              </div>

              <ImageUpload
                currentImage={form.image}
                onUpload={(url) => setForm({ ...form, image: url })}
                label="Item Photo"
              />

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) =>
                    setForm({ ...form, available: e.target.checked })
                  }
                  className="rounded border-gray-300 text-forkit-orange focus:ring-forkit-orange"
                />
                <span className="text-sm text-gray-700">Available for ordering</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {saving ? "Saving..." : form.id ? "Update" : "Add Item"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">📋</span>
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            No menu items yet
          </h2>
          <p className="text-gray-500 mt-2">
            Click &quot;Add Item&quot; to create your first menu item.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
            <span className="text-base">☰</span>
            Drag the handle on the top-left of each item to reorder, then click &quot;Save Order&quot; to apply.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="flex flex-col gap-3 max-w-3xl">
                {items.map((item) => (
                  <SortableMenuItem
                    key={item.id}
                    item={item}
                    restaurantId={restaurantId!}
                    restaurantSlug={restaurantSlug}
                    restaurantName={restaurantName}
                    currency={currency}
                    expanded={expandedId === item.id}
                    onToggle={() =>
                      setExpandedId((prev) => (prev === item.id ? null : item.id))
                    }
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}
