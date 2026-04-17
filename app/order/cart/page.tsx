"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useCart } from "@/hooks/useCart";
import { useEscrow } from "@/hooks/useEscrow";
import { CUSTOMER_DEPOSIT_PCT } from "@/lib/constants";

export default function CartPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
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

  const deliveryFee = 0; // fetched from restaurant in production
  const deposit = total * (CUSTOMER_DEPOSIT_PCT / 100);
  const grandTotal = total + deliveryFee + deposit;

  const handleCheckout = async () => {
    if (!connected || !publicKey || !restaurantId) return;

    setPlacing(true);
    setError(null);
    try {
      // 1. Create order in database
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          customerWallet: publicKey.toBase58(),
          items: items.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json();
        throw new Error(data.error || "Failed to create order");
      }

      const order = await orderRes.json();

      // 2. Create on-chain escrow
      try {
        const { signature } = await createOrder({
          orderId: order.id,
          restaurantWallet: order.restaurant?.wallet || "",
          amount: order.escrowTarget,
          currency: "USDC",
        });

        // 3. Update order with on-chain info
        await fetch(`/api/orders/${order.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "funded",
            onChainOrderId: signature,
          }),
        });

        // Record the customer's contribution
        await fetch(`/api/orders/${order.id}/contribute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          Your cart is empty
        </h1>
        <p className="mt-2 text-gray-500">
          Browse restaurants and add some delicious items!
        </p>
        <Link href="/restaurants" className="mt-6 btn-primary">
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-forkit-dark mb-2">Checkout</h1>
      {restaurantName && (
        <p className="text-gray-500 mb-8">
          Ordering from{" "}
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Totals */}
      <div className="card mt-6 p-5 space-y-3">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal</span>
          <span>{total.toFixed(2)} USDC</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Delivery fee</span>
            <span>{deliveryFee.toFixed(2)} USDC</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            Deposit ({CUSTOMER_DEPOSIT_PCT}%)
            <span className="ml-1 text-xs text-gray-400">refundable</span>
          </span>
          <span>{deposit.toFixed(2)} USDC</span>
        </div>
        <div className="border-t pt-3 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-forkit-orange">{grandTotal.toFixed(2)} USDC</span>
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
            <p className="text-gray-500 mb-4">
              Connect your wallet to pay with Solana
            </p>
            <WalletMultiButton className="!bg-forkit-orange hover:!bg-orange-600 !rounded-xl !h-12 !text-base !mx-auto" />
          </div>
        ) : (
          <button
            onClick={handleCheckout}
            disabled={placing}
            className="w-full py-4 bg-forkit-orange text-white rounded-xl font-semibold text-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {placing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Pay ${grandTotal.toFixed(2)} USDC`
            )}
          </button>
        )}
      </div>

      {/* Split payment info */}
      <p className="mt-4 text-center text-sm text-gray-400">
        💡 After checkout, you can share a link for friends to split the bill
      </p>
    </div>
  );
}
