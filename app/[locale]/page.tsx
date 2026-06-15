"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-forkit-cream via-white to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-forkit-orange px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Image src="/logo.png" alt="" width={20} height={20} className="rounded" />
              {t("badge")}
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-forkit-dark leading-tight">
              {t("heroTitle")}{" "}
              <span className="text-forkit-orange">{t("heroTitleAccent")}</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed max-w-2xl">
              {t("heroDescription")}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/dashboard" className="btn-primary text-lg">
                {t("buildMerchant")}
              </Link>
              <Link href="/merchants" className="btn-secondary text-lg">
                {t("browseMerchants")}
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-10 text-8xl opacity-10 rotate-12">
          🍕
        </div>
        <div className="absolute bottom-20 right-40 text-6xl opacity-10 -rotate-12">
          🍜
        </div>
        <div className="absolute top-40 right-60 text-7xl opacity-10 rotate-6">
          🌮
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-forkit-dark">
              {t("howItWorks")}
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              {t("howItWorksSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: "👛",
                title: t("step1Title"),
                desc: t("step1Desc"),
              },
              {
                step: "2",
                icon: "🎨",
                title: t("step2Title"),
                desc: t("step2Desc"),
              },
              {
                step: "3",
                icon: "💰",
                title: t("step3Title"),
                desc: t("step3Desc"),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="card p-8 text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-50 rounded-2xl text-3xl mb-6">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-forkit-dark mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-forkit-dark">
                {t("whyLove")}
              </h2>
              <div className="mt-10 space-y-8">
                {[
                  {
                    icon: "🏷️",
                    title: t("feature1Title"),
                    desc: t("feature1Desc"),
                  },
                  {
                    icon: "🔒",
                    title: t("feature2Title"),
                    desc: t("feature2Desc"),
                  },
                  {
                    icon: "👥",
                    title: t("feature3Title"),
                    desc: t("feature3Desc"),
                  },
                  {
                    icon: "⚡",
                    title: t("feature4Title"),
                    desc: t("feature4Desc"),
                  },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-forkit-dark">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-gray-500">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-400 mb-2">
                  {t("templatePreview")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: t("templateClassic"), color: "#8B4513", bg: "#FFF8F0" },
                    { name: t("templateModern"), color: "#1A1A1A", bg: "#FFFFFF" },
                    { name: t("templateStreet"), color: "#FF6B35", bg: "#1A1A2E" },
                    { name: t("templateFine"), color: "#C9A96E", bg: "#0D0D0D" },
                  ].map((tmpl) => (
                    <div
                      key={tmpl.name}
                      className="rounded-xl p-4 border border-gray-100"
                      style={{ backgroundColor: tmpl.bg }}
                    >
                      <div
                        className="w-6 h-1 rounded mb-2"
                        style={{ backgroundColor: tmpl.color }}
                      />
                      <p
                        className="text-xs font-semibold"
                        style={{ color: tmpl.color }}
                      >
                        {tmpl.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Customers */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-forkit-dark">
            {t("forCustomers")}
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            {t("forCustomersDesc")}
          </p>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🔍", title: t("customerStep1"), desc: t("customerStep1Desc") },
              { icon: "🛒", title: t("customerStep2"), desc: t("customerStep2Desc") },
              { icon: "💳", title: t("customerStep3"), desc: t("customerStep3Desc") },
              { icon: "🤝", title: t("customerStep4"), desc: t("customerStep4Desc") },
            ].map((step) => (
              <div key={step.title} className="card p-6">
                <span className="text-3xl">{step.icon}</span>
                <h3 className="mt-3 font-bold text-forkit-dark">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Link href="/merchants" className="btn-primary text-lg">
              {t("exploreMerchants")}
            </Link>
          </div>
        </div>
      </section>

      {/* ForkMe App Download */}
      <section className="py-24 bg-gradient-to-br from-forkit-dark to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white">
                {t("getTheApp")}
              </h2>
              <p className="mt-4 text-lg text-gray-400 leading-relaxed">
                {t("appDesc")}
              </p>
              <p className="mt-6 text-sm text-gray-500">
                {t("appAvailable")}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="https://github.com/douglasdemaio/forkme/releases/latest/download/forkme-android.apk"
                  className="inline-flex items-center gap-2 bg-forkit-orange text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.67-.81 1.76-1.37 2.68-1.41.1 1.06-.29 2.12-.93 2.9-.65.81-1.73 1.36-2.74 1.31-.11-1.04.28-2.07.99-2.8z" />
                  </svg>
                  {t("appAndroid")}
                </a>
                <a
                  href="https://apps.apple.com/app/forkme/id0000000000"
                  className="inline-flex items-center gap-2 bg-white text-forkit-dark px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.67-.81 1.76-1.37 2.68-1.41.1 1.06-.29 2.12-.93 2.9-.65.81-1.73 1.36-2.74 1.31-.11-1.04.28-2.07.99-2.8z" />
                  </svg>
                  {t("appIos")}
                </a>
                <a
                  href="https://github.com/douglasdemaio/forkme/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z" />
                  </svg>
                  {t("appGithub")}
                </a>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 bg-gradient-to-br from-forkit-orange/20 to-forkit-purple/20 rounded-3xl" />
                <div className="relative flex flex-col items-center justify-center h-full">
                  <span className="text-8xl mb-4">📱</span>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                    <p className="text-white/60 text-xs text-center">{t("qrHint")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-forkit-dark">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            {t("ctaDesc")}
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-forkit-orange text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-colors"
            >
              {t("getStarted")}
            </Link>
            <a
              href="https://github.com/douglasdemaio/forkit"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors"
            >
              {t("viewOnGithub")}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forkit-dark border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍴</span>
              <span className="text-white font-bold">ForkIt</span>
              <span className="text-gray-500 text-sm ml-2">
                {t("footerTagline")}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a
                href="https://github.com/douglasdemaio/forkit"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {t("footerProtocol")}
              </a>
              <a
                href="https://github.com/douglasdemaio/forkme"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {t("footerMobileApp")}
              </a>
              <a
                href="https://github.com/douglasdemaio/forkit-site"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {t("footerGithub")}
              </a>
            </div>
          </div>
          <p className="mt-8 text-center text-gray-600 text-sm">
            © {new Date().getFullYear()} ForkIt Protocol. MIT License.
          </p>
        </div>
      </footer>
    </div>
  );
}
