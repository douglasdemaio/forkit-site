"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./wallet-button";
import { useCart } from "@/hooks/useCart";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./language-switcher";

export default function Navbar() {
  const { connected } = useWallet();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🍴</span>
            <span className="text-xl font-bold text-forkit-dark">ForkIt</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/restaurants"
              className="text-gray-600 hover:text-forkit-orange transition-colors"
            >
              {t("restaurants")}
            </Link>
            {connected && (
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-forkit-orange transition-colors"
              >
                {t("dashboard")}
              </Link>
            )}
            <Link
              href="/order/cart"
              className="relative text-gray-600 hover:text-forkit-orange transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-forkit-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
            <LanguageSwitcher />
            <WalletButton className="!bg-forkit-orange hover:!bg-orange-600 !rounded-lg !h-10 !text-sm" />
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <Link
              href="/restaurants"
              className="block text-gray-600 hover:text-forkit-orange"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("restaurants")}
            </Link>
            {connected && (
              <Link
                href="/dashboard"
                className="block text-gray-600 hover:text-forkit-orange"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("dashboard")}
              </Link>
            )}
            <Link
              href="/order/cart"
              className="block text-gray-600 hover:text-forkit-orange"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("cart")} {itemCount > 0 && `(${itemCount})`}
            </Link>
            <div className="pt-2">
              <LanguageSwitcher />
            </div>
            <WalletButton className="!bg-forkit-orange hover:!bg-orange-600 !rounded-lg !h-10 !text-sm" />
          </div>
        )}
      </div>
    </nav>
  );
}
