import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-forkit-cream via-white to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-forkit-orange px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span>🍴</span> Powered by Solana
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-forkit-dark leading-tight">
              Your restaurant,{" "}
              <span className="text-forkit-orange">on-chain.</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed max-w-2xl">
              Build a beautiful restaurant website in minutes. Accept payments
              in USDC or EURC via Solana escrow. Let customers split bills with
              friends. No middlemen, no 30% fees.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/dashboard" className="btn-primary text-lg">
                Build Your Restaurant →
              </Link>
              <Link href="/restaurants" className="btn-secondary text-lg">
                Browse Restaurants
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
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              From setup to first order in under 10 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: "👛",
                title: "Connect Wallet",
                desc: "Sign in with your Solana wallet (Phantom, Solflare). No email, no password — your wallet is your identity.",
              },
              {
                step: "2",
                icon: "🎨",
                title: "Build Your Page",
                desc: "Choose a template, upload food photos, set your menu with prices in USDC or EURC. Publish when ready.",
              },
              {
                step: "3",
                icon: "💰",
                title: "Accept Orders",
                desc: "Customers order and pay via Solana escrow. Funds release on delivery confirmation. Split payments built in.",
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
                Why restaurants love ForkIt
              </h2>
              <div className="mt-10 space-y-8">
                {[
                  {
                    icon: "🏷️",
                    title: "0.02% protocol fee",
                    desc: "Compare that to 15-30% from traditional platforms. Keep what you earn.",
                  },
                  {
                    icon: "🔒",
                    title: "Escrow-protected payments",
                    desc: "Customer funds are held in on-chain escrow. Released on delivery confirmation.",
                  },
                  {
                    icon: "👥",
                    title: "Split payments",
                    desc: "Customers can share an order link. Up to 10 friends can chip in via contribute_to_order.",
                  },
                  {
                    icon: "⚡",
                    title: "Instant settlement",
                    desc: "No waiting 2 weeks for payouts. Funds settle to your wallet on confirmation.",
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
                  Template Preview
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "Classic Bistro", color: "#8B4513", bg: "#FFF8F0" },
                    { name: "Modern Minimal", color: "#1A1A1A", bg: "#FFFFFF" },
                    { name: "Street Food", color: "#FF6B35", bg: "#1A1A2E" },
                    { name: "Fine Dining", color: "#C9A96E", bg: "#0D0D0D" },
                  ].map((t) => (
                    <div
                      key={t.name}
                      className="rounded-xl p-4 border border-gray-100"
                      style={{ backgroundColor: t.bg }}
                    >
                      <div
                        className="w-6 h-1 rounded mb-2"
                        style={{ backgroundColor: t.color }}
                      />
                      <p
                        className="text-xs font-semibold"
                        style={{ color: t.color }}
                      >
                        {t.name}
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
            For hungry people
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Browse local restaurants, order food, and pay with crypto.
            Split the bill with friends in one tap.
          </p>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🔍", title: "Browse", desc: "Find restaurants near you" },
              { icon: "🛒", title: "Order", desc: "Add items to your cart" },
              { icon: "💳", title: "Pay", desc: "USDC/EURC via Solana" },
              { icon: "🤝", title: "Split", desc: "Share with up to 10 friends" },
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
            <Link href="/restaurants" className="btn-primary text-lg">
              Explore Restaurants →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-forkit-dark">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white">
            Ready to fork the food industry?
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Join the decentralized food delivery revolution. Connect your wallet
            and build your restaurant page today.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-forkit-orange text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-orange-600 transition-colors"
            >
              Get Started — It&apos;s Free
            </Link>
            <a
              href="https://github.com/douglasdemaio/forkit"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors"
            >
              View on GitHub
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
                Decentralized food delivery on Solana
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a
                href="https://github.com/douglasdemaio/forkit"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Protocol
              </a>
              <a
                href="https://github.com/douglasdemaio/forkme"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Mobile App
              </a>
              <a
                href="https://github.com/douglasdemaio/forkit-site"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                GitHub
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
