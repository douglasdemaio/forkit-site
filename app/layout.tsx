import type { Metadata } from "next";
import { AppWalletProvider } from "@/components/wallet-provider";
import Navbar from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForkIt — Restaurant Builder on Solana",
  description:
    "Build your restaurant website and accept crypto payments via Solana. Escrow-based ordering, split payments, and beautiful templates.",
  openGraph: {
    title: "ForkIt — Restaurant Builder on Solana",
    description:
      "Build your restaurant website and accept crypto payments via Solana.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <AppWalletProvider>
          <Navbar />
          <main>{children}</main>
        </AppWalletProvider>
      </body>
    </html>
  );
}
