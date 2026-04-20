# ForkIt Site — Restaurant Builder + Ordering Platform on Solana

A **template-style restaurant website builder** with integrated ordering and **Solana payments**. Restaurant owners build beautiful pages in minutes. Customers order food and pay with USDC/EURC through on-chain escrow — with built-in bill splitting.

**Part of the ForkIt Protocol** — decentralized food delivery on Solana.

---

## What Is This?

ForkIt Site lets anyone create a professional restaurant page and start accepting crypto orders:

### For Restaurant Owners

1. **Connect** your Solana wallet (Phantom, Solflare)
2. **Choose a template** — Classic Bistro, Modern Minimal, Street Food, or Fine Dining
3. **Customize your brand** — pick 3 hex colors (primary, secondary, accent) and choose from 26 open-source Google Fonts; 8 preset palettes provided
4. **Upload** food photos, set menu items with names, descriptions, and prices (USDC/EURC)
5. **Reorder menu items** — drag-and-drop to arrange your menu in any order you like
6. **Run multiple restaurants** from a single wallet — independent menus, branding, and publish state per location
7. **Publish** your page — it's live and accepting orders instantly
8. **Manage orders** — see incoming orders in real-time (15-second polling with notification banner)
9. **Close out orders with verification** — ask the customer for their pickup/delivery code and enter it to mark the order as delivered
10. **Separate payout wallet** (optional) — direct earnings to a different address from your login wallet; every change is recorded on-chain for auditability

### For Customers

1. **Browse** restaurant pages
2. **Add items** to your shopping cart
3. **Checkout** via the ForkIt smart contract (escrow-based payment on Solana)
4. **Enter delivery address** at checkout (or leave blank for pickup)
5. **Split orders** with friends — share a link and up to 10 people can contribute (friends can chip in even after funding to reimburse the original payer)
6. **Schedule delivery/pickup** — choose a preferred time or order for ASAP
7. **Track** your order status in real-time
8. **Receive a verification code** — show your delivery/pickup code to the restaurant to close out the order

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** |
| Database | **Prisma + SQLite** (easy local dev; swap to Postgres for production) |
| Blockchain | **Solana** (devnet) via `@solana/web3.js` |
| Wallet | **Solana Wallet Adapter** (Phantom, Solflare) |
| Auth | Nonce-signing → **JWT** (wallet-based, no passwords) |
| State | **Zustand** (cart) |
| i18n | **next-intl** (10 languages, RTL support) |
| Deployment | **Vercel** |

---

## Smart Contract Details

ForkIt uses three on-chain programs:

| Program | ID |
|---------|----|
| Escrow | `FNZXjjq2oceq15jVsnHT8gYJQUZ9NLCXCpYak2pXsqGB` |
| Registry | `2riHMdVB6eFgeQjqvnqq2Mrpqea7hrMv5ZNRh7gZgB9S` |
| Loyalty | `6DaFmi7haz2Ci9sXaHRviz3biwbmTwipvwc9L9cdeugR` |

- **Protocol fee:** 0.02% (2 basis points)
- **Customer deposit:** None — escrow target is food + delivery only; post-funding contributions are proportionally reimbursed via `claim_deposit` after settlement
- **Delivery timeout:** 3 hours
- **Pickup timeout:** 45 minutes
- **Max contributors per order:** 10
- **Treasury:** `BiP5PJuUiXPYCFx98RMCGCnRhdUVrkxSke9C6y2ZohQ9`
- **Payout wallet changes** are recorded on-chain via the `PayoutWalletChanged` event for auditability

Token mints (devnet):
- USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- EURC: `CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM`

---

## Local Development

### Prerequisites

- Node.js ≥ 18
- npm

### Setup

```bash
git clone https://github.com/douglasdemaio/forkit-site.git
cd forkit-site

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Initialize database
npx prisma db push

# Start dev server
npm run dev
```

Open http://localhost:3000

### Environment Variables

```env
# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# JWT secret for wallet auth
JWT_SECRET=your-jwt-secret-change-me

# Upload directory
UPLOAD_DIR=./public/uploads

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=file:./dev.db
```

### Database

Using Prisma with SQLite for zero-config local development. For production, update `prisma/schema.prisma` to use PostgreSQL and set `DATABASE_URL` accordingly.

```bash
# Push schema changes
npx prisma db push

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Generate client after schema changes
npx prisma generate
```

---

## Project Structure

```
forkit-site/
├── app/                          # Next.js App Router pages
│   ├── [locale]/                 # Locale-prefixed routes (de, es, fr, ja, ...)
│   │   ├── page.tsx              # Landing page
│   │   ├── dashboard/            # Owner dashboard (menu, template, orders)
│   │   ├── restaurants/          # Public restaurant browsing
│   │   ├── order/                # Cart + order tracking
│   │   └── connect/              # Wallet connection page
│   └── api/                      # API routes (locale-agnostic)
│       ├── auth/                 # Wallet auth (nonce + verify)
│       ├── restaurants/          # CRUD restaurants + menus
│       │   └── [id]/menu/reorder # Drag-and-drop persistence
│       ├── orders/               # Create orders + contributions
│       │   └── [id]/verify       # Restaurant closes order with customer's code
│       └── upload/               # Image upload
├── components/                   # React components (incl. language-switcher, sortable-menu-item)
├── hooks/                        # Custom hooks (wallet, escrow, cart, orders)
├── lib/                          # Utilities (constants, db, auth, types, templates, fonts)
├── messages/                     # i18n translation JSON files (en, de, es, fr, ja, zh, pt, ko, ar, tr)
├── i18n.ts                       # next-intl configuration
├── middleware.ts                 # Locale routing middleware
├── store/                        # Zustand state management
├── prisma/                       # Database schema
└── public/                       # Static assets + uploads
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables in Vercel dashboard
4. For production, use a hosted PostgreSQL (e.g., Vercel Postgres, Neon, Supabase)
5. Update `DATABASE_URL` and Prisma provider accordingly

The included GitHub Actions workflow automates deployment on push to `main`.

---

## Internationalization (i18n)

ForkIt supports **10 languages** out of the box via [next-intl](https://next-intl-docs.vercel.app/):

| Language | Code | Native Name |
|----------|------|-------------|
| English | `en` | English (default) |
| German | `de` | Deutsch |
| Spanish | `es` | Español |
| French | `fr` | Français |
| Japanese | `ja` | 日本語 |
| Chinese | `zh` | 中文 |
| Portuguese | `pt` | Português |
| Korean | `ko` | 한국어 |
| Arabic | `ar` | العربية (RTL) |
| Turkish | `tr` | Türkçe |

- English is the default locale — URLs stay clean without `/en/` prefix
- Other languages use a locale prefix (e.g., `/de/dashboard`, `/ja/order/cart`)
- Arabic has full RTL layout support
- Translation files live in `messages/` as JSON, organized by page/component
- A language switcher dropdown is available in the navbar
- Only UI chrome is translated — restaurant-created content (menu items, descriptions) stays in the owner's language

To add a new language:
1. Create `messages/<code>.json` with all translation keys
2. Add the locale code to the `locales` array in `i18n.ts`

---

## Templates & Custom Branding

Four built-in templates, each providing a different CSS theme/layout:

| Template | Vibe |
|----------|------|
| **Classic Bistro** | Warm, earthy tones. Family restaurants, trattorias |
| **Modern Minimal** | Clean white space. Cafés, health food, juice bars |
| **Street Food** | Vibrant, colorful. Food trucks, taco joints |
| **Fine Dining** | Dark, elegant. Upscale restaurants, wine bars |

### Custom Branding

Restaurant owners can override template defaults with custom branding:

- **3 custom hex colors** — Primary (buttons/headings), Secondary (backgrounds), Accent (text/details)
- **8 curated palette presets** — Warm Classic, Forest & Cream, Ocean Blue, Rose Gold, Minimal Mono, Sunset, Matcha, Midnight Wine
- **26 open-source Google Fonts** across 5 categories:
  - **Sans-serif**: Inter, Poppins, Montserrat, Raleway, Nunito, Work Sans, DM Sans, Quicksand
  - **Serif**: Playfair Display, Merriweather, Lora, Cormorant Garamond, Libre Baskerville, Crimson Text
  - **Display**: Bebas Neue, Abril Fatface, Righteous, Lobster, Pacifico, Amatic SC, Fredoka
  - **Handwriting**: Dancing Script, Caveat, Kalam, Satisfy
  - **Monospace**: JetBrains Mono, Space Mono
- **Live preview** updates as you pick colors and fonts
- **Drag-to-reorder menu items** — arrange your menu in any order; changes save automatically

All fonts are licensed under SIL Open Font License (OFL) or Apache 2.0.

---

## Related Repos

| Repo | Description |
|------|-------------|
| [forkit](https://github.com/douglasdemaio/forkit) | Protocol — Solana programs (escrow, registry, loyalty), Express backend, test suite |
| [forkme](https://github.com/douglasdemaio/forkme) | Mobile companion — React Native (Expo), iOS/Android customer + seeker apps |

---

## Feature Highlights (recent additions)

- 🎨 **Custom branding** — 3 hex colors + Google Fonts with live preview
- ☰ **Drag-and-drop menu reordering** — powered by @dnd-kit
- 🔐 **Order code verification** — restaurant closes out orders by confirming the customer's delivery/pickup code
- 🏪 **Multi-restaurant support** — run multiple locations from one wallet
- 📍 **Delivery address field** at checkout
- 💎 **Separate payout wallet** — on-chain audit via `PayoutWalletChanged` event
- ⚡ **Post-funding contributions** — friends can chip in to reimburse the original payer after the order is funded
- ⏰ **Scheduled orders** — set a preferred delivery or pickup time, or leave blank for ASAP
- 🌍 **10 languages** with full RTL for Arabic
- 🔗 **Social preview** — og:image and twitter:card metadata for proper link previews

---

## Phase 2 (Planned)

These features are referenced in UI copy or have partial on-chain stubs but are **not yet fully implemented**:

- **Loyalty tier discounts** (Bronze → Platinum, 5–20% fee reduction) — a contract stub exists in the Loyalty program, but tier logic and the `$FORK` token are pending
- **AI-routed delivery bonus points** (+50%) — referenced in UI copy; no routing system is implemented yet
- **Surge pricing UI** — the `set_surge_pricing` instruction exists on-chain, but no admin UI is included in this repo yet

---

## License

MIT
