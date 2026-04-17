"use client";

import { ContributionData } from "@/lib/types";

interface FundingBarProps {
  target: number;
  contributions: ContributionData[];
  currency?: string;
}

// Generate consistent colors for wallet addresses
function walletColor(wallet: string): string {
  const colors = [
    "#FF6B35", "#6C63FF", "#2ECC71", "#E74C3C", "#3498DB",
    "#9B59B6", "#F39C12", "#1ABC9C", "#E67E22", "#2980B9",
  ];
  let hash = 0;
  for (let i = 0; i < wallet.length; i++) {
    hash = wallet.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function shortenWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export default function FundingBar({
  target,
  contributions,
  currency = "USDC",
}: FundingBarProps) {
  const totalFunded = contributions.reduce((sum, c) => sum + c.amount, 0);
  const percentage = Math.min((totalFunded / target) * 100, 100);

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">
          {totalFunded.toFixed(2)} / {target.toFixed(2)} {currency}
        </span>
        <span className="font-medium text-gray-900">
          {percentage.toFixed(0)}% funded
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
        {contributions.map((c) => {
          const width = (c.amount / target) * 100;
          return (
            <div
              key={c.id}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${width}%`,
                backgroundColor: walletColor(c.contributorWallet),
              }}
              title={`${shortenWallet(c.contributorWallet)}: ${c.amount.toFixed(2)} ${currency}`}
            />
          );
        })}
      </div>

      {/* Contributors */}
      <div className="flex flex-wrap gap-2">
        {contributions.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-1.5 text-xs bg-gray-50 rounded-full px-3 py-1"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: walletColor(c.contributorWallet) }}
            />
            <span className="font-mono">
              {shortenWallet(c.contributorWallet)}
            </span>
            <span className="text-gray-400">
              {c.amount.toFixed(2)} {currency}
            </span>
          </div>
        ))}
      </div>

      {/* Remaining */}
      {totalFunded < target && (
        <p className="text-sm text-gray-400">
          {(target - totalFunded).toFixed(2)} {currency} remaining
        </p>
      )}
    </div>
  );
}
