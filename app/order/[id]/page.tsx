"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useOrderStatus } from "@/hooks/useOrderStatus";
import { useEscrow } from "@/hooks/useEscrow";
import OrderTracker from "@/components/order-tracker";
import FundingBar from "@/components/funding-bar";

export default function OrderPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { publicKey, connected } = useWallet();
  const { order, loading, error, refetch } = useOrderStatus(orderId);
  const { contributeToOrder } = useEscrow();
  const [contributeAmount, setContributeAmount] = useState("");
  const [contributing, setContributing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleContribute = async () => {
    if (!order || !publicKey || !contributeAmount) return;

    setContributing(true);
    try {
      const amount = parseFloat(contributeAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");

      const { signature } = await contributeToOrder({
        orderId: order.id,
        escrowPda: order.onChainOrderId || "",
        amount,
        currency: order.restaurant?.currency || "USDC",
      });

      // Record contribution
      await fetch(`/api/orders/${order.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributorWallet: publicKey.toBase58(),
          amount,
          txSignature: signature,
        }),
      });

      setContributeAmount("");
      refetch();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Contribution failed");
    } finally {
      setContributing(false);
    }
  };

  const copyShareLink = () => {
    if (!order?.shareLink) return;
    navigator.clipboard.writeText(order.shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forkit-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <span className="text-6xl">🔍</span>
        <h1 className="mt-6 text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-gray-500">{error || "This order doesn't exist."}</p>
      </div>
    );
  }

  const totalContributed = order.contributions.reduce(
    (sum, c) => sum + c.amount,
    0
  );
  const remaining = Math.max(0, order.escrowTarget - totalContributed);
  const currency = order.restaurant?.currency || "USDC";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-forkit-dark">
            Order #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-gray-500">
            {order.restaurant?.name} ·{" "}
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Order tracker */}
      <div className="card p-6 mb-6">
        <OrderTracker status={order.status} />
      </div>

      {/* Items */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Items</h2>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.quantity}× {item.name}
              </span>
              <span className="font-medium">
                {(item.price * item.quantity).toFixed(2)} {currency}
              </span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{order.totalAmount.toFixed(2)} {currency}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery</span>
                <span>{order.deliveryFee.toFixed(2)} {currency}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>Deposit</span>
              <span>{order.depositAmount.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between font-semibold mt-1">
              <span>Total</span>
              <span className="text-forkit-orange">
                {order.escrowTarget.toFixed(2)} {currency}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Funding progress */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Funding</h2>
        <FundingBar
          target={order.escrowTarget}
          contributions={order.contributions}
          currency={currency}
        />
      </div>

      {/* Contribute section */}
      {remaining > 0 && order.status === "pending" && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            Contribute to this order
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Split the bill! Anyone with this link can contribute.
          </p>

          {!connected ? (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">
                Connect wallet to contribute
              </p>
              <WalletMultiButton className="!bg-forkit-orange hover:!bg-orange-600 !rounded-xl !h-10 !text-sm !mx-auto" />
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder={`Up to ${remaining.toFixed(2)} ${currency}`}
                className="flex-1 px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-forkit-orange/20 focus:border-forkit-orange"
              />
              <button
                onClick={handleContribute}
                disabled={contributing || !contributeAmount}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {contributing ? "..." : "Contribute"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Share link */}
      {order.shareLink && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            Share with friends
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Send this link to friends so they can chip in on the order.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={order.shareLink}
              className="flex-1 px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-mono text-gray-600"
            />
            <button
              onClick={copyShareLink}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
