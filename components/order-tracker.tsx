"use client";

import { OrderStatus } from "@/lib/types";

const STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "Created",   label: "Order Placed",       icon: "📝" },
  { status: "Funded",    label: "Payment Confirmed",  icon: "💰" },
  { status: "Preparing", label: "Preparing",          icon: "👨‍🍳" },
  { status: "Delivered", label: "Delivered",          icon: "🎉" },
  { status: "Settled",   label: "Completed",          icon: "✅" },
];

interface OrderTrackerProps {
  status: OrderStatus;
}

export default function OrderTracker({ status }: OrderTrackerProps) {
  const currentIndex = STEPS.findIndex((s) => s.status === status);
  const isCancelled = status === "Cancelled";

  if (isCancelled) {
    return (
      <div className="text-center py-8">
        <span className="text-5xl">❌</span>
        <h3 className="mt-4 text-xl font-bold text-red-600">
          Order Cancelled
        </h3>
        <p className="mt-2 text-gray-500">
          This order has been cancelled. Funds will be refunded.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isComplete = i <= currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step.status} className="flex-1 relative">
              <div className="flex flex-col items-center">
                {/* Connector line */}
                {i > 0 && (
                  <div
                    className={`absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                      i <= currentIndex ? "bg-forkit-green" : "bg-gray-200"
                    }`}
                  />
                )}

                {/* Step circle */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    isComplete
                      ? "bg-forkit-green text-white"
                      : "bg-gray-100 text-gray-400"
                  } ${isCurrent ? "ring-4 ring-green-100 animate-pulse" : ""}`}
                >
                  {step.icon}
                </div>

                {/* Label */}
                <span
                  className={`mt-2 text-xs text-center ${
                    isComplete ? "text-gray-900 font-medium" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
