import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AppWalletProvider } from "@/components/wallet-provider";
import Navbar from "@/components/navbar";
import "../globals.css";
import { locales, type Locale } from "@/i18n-config";

export const metadata: Metadata = {
  title: "ForkIt — Restaurant Builder on Solana",
  description:
    "Build your restaurant website and accept crypto payments via Solana. Escrow-based ordering, split payments, and beautiful templates.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "ForkIt — Restaurant Builder on Solana",
    description:
      "Build your restaurant website and accept crypto payments via Solana.",
    type: "website",
    images: ["https://opengraph.githubassets.com/1/douglasdemaio/forkit"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ForkIt — Restaurant Builder on Solana",
    description:
      "Build your restaurant website and accept crypto payments via Solana.",
    images: ["https://opengraph.githubassets.com/1/douglasdemaio/forkit"],
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-white">
        <NextIntlClientProvider messages={messages}>
          <AppWalletProvider>
            <Navbar />
            <main>{children}</main>
          </AppWalletProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
