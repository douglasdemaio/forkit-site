# ForkIt Site — Merchant Storefront + On-Chain Ordering on Solana

A **template-style storefront builder** for any local merchant — restaurants, home kitchens, bakeries, bookshops, florists, hardware stores — with integrated ordering and **Solana payments**. Merchants build a branded page in minutes, place themselves on the map, and start taking USDC/EURC orders through on-chain escrow with built-in bill splitting.

**Part of the ForkIt Protocol** — an open protocol for local commerce on Solana. Customers, merchants, and drivers transact directly; the protocol takes 0.02%, not 30%.

---

## What Is This?

ForkIt Site is the **merchant-facing** half of the platform. Anyone can sign in with a Solana wallet, pick a vendor type, drop themselves on a map, and start accepting crypto orders.

### For Merchants

1. **Connect** your Solana wallet (Phantom, Solflare)
2. **Pick your vendor type** — `restaurant`, `home_cook`, or `retail` — and the storefront tunes its defaults accordingly (e.g. home kitchens default to pickup-only)
3. **Pick your category & subcategory** — seven top-level groups (Food & Beverage, Retail & Shopping, Health & Wellness, Home & Living, Beauty & Personal Care, Specialty/Niche, Business & Professional) with subcategory cascade
4. **Place yourself on the map** — draggable pin with reverse-geocode + forward-geocode (Nominatim) so customers can find you
5. **Choose a template** — Classic Bistro, Modern Minimal, Street Food, Fine Dining, or fully Custom
6. **Customize your brand** — pick 3 hex colors (primary / secondary / accent) and choose from 26 open-source Google Fonts; 8 preset palettes provided
7. **Upload** product photos, set menu/catalog items with names, descriptions, and prices in your accepted token (USDC, EURC, PYUSD)
8. **Drag-to-reorder** menu items — arrange your catalog in any order; saves automatically
9. **Run multiple storefronts** from a single wallet — independent menus, branding, location, and publish state per location
10. **Publish** your page — live and accepting orders instantly at `/merchants/<slug>`
11. **Manage orders** — incoming-order dashboard with 15-second polling and a notification banner; toggle **auto-acknowledge** to skip the manual accept step
12. **Open delivery to driver bidding, or self-deliver** — let the driver pool bid down the delivery fee and pick the lowest, or fulfill in-house
13. **Close out with code verification** — scan the customer's QR or enter their code by hand to release escrow
14. **Separate payout wallet** (optional) — direct earnings to a different address from your login wallet; every change is recorded on-chain via the `PayoutWalletChanged` event for auditability

### For Customers

1. **Browse nearby merchants** — restaurants, home cooks, bookshops, florists, and anything else local that takes orders
2. **Add items** to your cart
3. **Checkout** through the ForkIt smart contract (Solana escrow)
4. **Delivery or Pickup** — toggle at checkout; pickup waives the delivery fee
5. **Enter delivery address** — separate fields for Street, Apt, City, ZIP, State/Province, Country; country auto-detected from your timezone (independent of UI language)
6. **Split orders with friends** — share a link and up to 10 people can contribute; friends can even chip in after the order is funded to reimburse the original payer
7. **Schedule** the delivery or pickup time, or leave it ASAP
8. **Track** order status in real time
9. **Receive a verification code** — show your delivery/pickup code to the merchant to close out the order

### For Drivers (via the [forkme](https://github.com/douglasdemaio/forkme) mobile app)

Drivers see funded orders in `Preparing` status, **bid an amount** they'd accept for the delivery, and the merchant picks the winner. The losing bidders are released and the customer is refunded the difference between their initial delivery fee deposit and the accepted bid via the on-chain `update_delivery_amount` instruction.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** |
| Database | **Prisma + PostgreSQL** (Neon on Vercel, any Postgres locally) |
| Blockchain | **Solana** (devnet) via `@solana/web3.js` |
| Wallet | **Solana Wallet Adapter** (Phantom, Solflare) |
| Auth | Nonce-signing → **JWT** (wallet-based, no passwords) |
| State | **Zustand** (cart) |
| Maps | **MapLibre GL** + Nominatim proxy at `/api/geocode` |
| Images | **sharp** for server-side resize (native binary rebuilt at container build) |
| i18n | **next-intl** (10 languages, RTL support) |
| Deployment | **Vercel** (also Docker / Podman / Kubernetes) |

---

## Smart Contract Details

ForkIt uses three on-chain programs (see [forkit](https://github.com/douglasdemaio/forkit) for the Anchor source):

| Program | ID (devnet) |
|---------|----|
| Escrow | `FNZXjjq2oceq15jVsnHT8gYJQUZ9NLCXCpYak2pXsqGB` |
| Registry | `2riHMdVB6eFgeQjqvnqq2Mrpqea7hrMv5ZNRh7gZgB9S` |
| Loyalty | `6DaFmi7haz2Ci9sXaHRviz3biwbmTwipvwc9L9cdeugR` |

- **Protocol fee:** 0.02% (2 basis points)
- **Customer deposit:** None — escrow target is goods + delivery only; post-funding contributions are proportionally reimbursed via `claim_deposit` after settlement
- **Driver bidding refund:** when the merchant accepts a bid lower than the initial delivery fee, the surplus is refunded to the customer via `update_delivery_amount` before pickup
- **Delivery timeout:** 3 hours
- **Pickup timeout:** 45 minutes
- **Max contributors per order:** 10
- **Treasury:** `BiP5PJuUiXPYCFx98RMCGCnRhdUVrkxSke9C6y2ZohQ9`
- **Payout-wallet changes** are recorded on-chain via the `PayoutWalletChanged` event

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

# Set up environment — fill in DATABASE_URL with a Postgres connection
# (free dev DB on Neon, Supabase, or `docker run postgres` locally)
cp .env.example .env

# Push schema to the database
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

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# CORS allow-list for the customer front-end (forkme)
FORKME_URL=https://forkme.example.com

# Database (Postgres). DIRECT_URL is the unpooled connection used by
# `prisma db push` / `prisma migrate`; DATABASE_URL is the pooled one.
# Both are auto-set when you attach Neon via Vercel Storage.
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host/db?sslmode=require

# Vercel Blob — auto-set when you attach a Blob store in the Vercel dashboard
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
```

### Database

Prisma with PostgreSQL. For local dev, point `DATABASE_URL` / `DIRECT_URL` at any Postgres instance (Neon free tier, Supabase, or a local `docker run postgres`). Vercel deployments use Neon attached via Vercel Storage.

```bash
# Push schema changes
npx prisma db push

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Generate client after schema changes
npx prisma generate

# Backfill lat/lng for legacy merchants (one-shot)
npx tsx scripts/backfill-merchant-coords.ts
```

---

## Project Structure

```
forkit-site/
├── app/                              # Next.js App Router
│   ├── [locale]/                     # Locale-prefixed routes (de, es, fr, ja, ...)
│   │   ├── page.tsx                  # Landing page
│   │   ├── dashboard/                # Merchant dashboard
│   │   │   ├── page.tsx              #   • Settings, branding, vendor type, map pin
│   │   │   ├── menu/                 #   • Menu editor (drag-to-reorder)
│   │   │   ├── orders/               #   • Incoming-order queue + bid review
│   │   │   └── template/             #   • Template + custom branding
│   │   ├── kiosk/[orderId]/          # Full-screen QR display for driver pickup
│   │   ├── merchants/                # Public merchant browsing
│   │   │   └── [slug]/menu/          #   • Storefront + menu
│   │   ├── restaurants/[slug]/       # Permanent alias → /merchants/[slug]
│   │   ├── order/                    # Cart + order tracking
│   │   ├── delivery/                 # Driver landing + bidding UI
│   │   └── connect/                  # Wallet connection
│   └── api/                          # API routes (locale-agnostic)
│       ├── auth/{nonce,verify}       # Wallet nonce + JWT verify
│       ├── geocode/                  # Nominatim proxy (server-side cache)
│       ├── merchants/                # CRUD merchants + menus
│       │   ├── mine/                 #   • Merchants owned by the signed-in wallet
│       │   └── [id]/menu/reorder/    #   • Drag-and-drop persistence
│       ├── orders/
│       │   ├── available/            #   • Drivers: open orders accepting bids
│       │   └── [id]/
│       │       ├── bids/             #     • Driver bidding (POST + GET)
│       │       │   └── [bidId]/accept #     • Merchant accepts a bid
│       │       ├── contribute/       #     • Record on-chain contributions
│       │       ├── funding/          #     • Funding progress
│       │       ├── rate-driver/      #     • Post-delivery driver rating
│       │       ├── receipt/          #     • Settlement receipt (post-Settled)
│       │       ├── scan-confirm/     #     • Public kiosk QR scan endpoint
│       │       ├── share/            #     • Generate contribution share link
│       │       ├── status/           #     • Status transitions (mobile app)
│       │       ├── verify/           #     • Web dashboard code verification
│       │       ├── verify-delivery/  #     • Customer confirms Code B → Settled
│       │       └── verify-pickup/    #     • Driver verifies Code A → PickedUp
│       ├── drivers/[wallet]/         # Driver profile + rating
│       ├── profile/customer/         # Customer profile
│       ├── upload/ + uploads/        # Image upload + serve (Blob on Vercel, disk locally)
│       └── debug/env/                # Build-time env dump (dev only)
├── components/                       # React components
│   ├── merchant-label.tsx            #   • "Restaurant" / "Home kitchen" / "Shop" pill
│   ├── sortable-menu-item.tsx        #   • @dnd-kit menu reordering
│   ├── language-switcher.tsx
│   ├── wallet-button.tsx + wallet-provider.tsx
│   ├── cart.tsx + funding-bar.tsx + order-tracker.tsx
│   ├── qr-scanner.tsx                #   • Kiosk + dashboard code verification
│   └── dashboard/                    #   • Map pin editor, taxonomy cascade, etc.
├── hooks/                            # Custom hooks (wallet, escrow, cart, orders)
├── lib/
│   ├── taxonomy.ts                   #   • VENDOR_TYPES + VENDOR_CATEGORIES cascade
│   ├── templates.ts                  #   • Template definitions
│   ├── fonts.ts                      #   • 26 Google Font options
│   ├── auth.ts + db.ts + types.ts
├── messages/                         # i18n JSON (en, de, es, fr, ja, zh, pt, ko, ar, tr)
├── i18n.ts                           # next-intl configuration
├── middleware.ts                     # Locale routing middleware
├── store/                            # Zustand state
├── prisma/                           # Database schema (Merchant, MenuItem, Order, DriverBid, …)
├── scripts/                          # backfill-merchant-coords.ts, migrations/
├── k8s/                              # Kubernetes manifests
├── mcp-server/                       # Rust MCP server (separate OCI pipeline)
├── compose.yaml                      # Docker / Podman compose
├── Dockerfile + Containerfile        # Identical multi-stage build (Docker / Podman)
└── public/                           # Static assets + uploads
```

---

## Data Model (high level)

The Prisma schema centers on a single `Merchant` model that replaces the previous `Restaurant` model. Key fields:

| Field | Notes |
|---|---|
| `vendorType` | `restaurant` \| `home_cook` \| `retail` (defaults to `restaurant`) |
| `category` + `subcategory` | Cascading taxonomy, validated against `lib/taxonomy.ts` |
| `latitude` + `longitude` | Set via the dashboard map pin (drag, or geocode an address) |
| `addressStreet` / `addressCity` / `addressCountry` | Optional, used for the geocode-from-address flow |
| `pickupOnly`, `selfDelivery`, `autoAcknowledge` | Operational flags |
| `payoutWallet` | Optional separate payout address (recorded on-chain) |
| `colorPrimary` / `colorSecondary` / `colorAccent` / `fontFamily` | Custom branding |

Orders have a `DriverBid` child table (`amount`, `status`) and a `DeliveryRating` table that captures post-delivery ratings from both the merchant and the customer.

---

## Deployment

Pick the target that matches your infrastructure.

### 1. Vercel

1. Push to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. **Attach storage** in the Vercel dashboard → *Storage*:
   - Create a **Neon Postgres** database — auto-populates `DATABASE_URL` and `DIRECT_URL`
   - Create a **Blob** store — auto-populates `BLOB_READ_WRITE_TOKEN`
4. Add the remaining env vars under *Settings → Environment Variables*:
   - `JWT_SECRET` (generate with `openssl rand -hex 32`)
   - `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_SOLANA_NETWORK`
   - `NEXT_PUBLIC_BASE_URL` (your deployed URL)
   - `FORKME_URL` (the customer front-end origin, for CORS)
5. Push the schema to the new Neon DB **once** from your machine:

   ```bash
   # pull the env values Vercel set up for you
   npx vercel env pull .env.production.local
   # push the Prisma schema using the unpooled DIRECT_URL
   DATABASE_URL="$DIRECT_URL" npx prisma db push
   ```

6. Redeploy. Wallet sign-in (the `Nonce` table) and image uploads (Vercel Blob) will work.

The included GitHub Actions workflow automates deployment on push to `main`.

### 2. Docker / Podman

A multi-stage `Dockerfile` (with identical `Containerfile`) produces a small, non-root Next.js image. Prisma schema, client, and query engine are bundled into the final image so migrations can run on startup, and `sharp`'s native binary is rebuilt in the build stage so server-side image resize works on Alpine.

The schema is **PostgreSQL-only** — point `DATABASE_URL` at a Postgres instance before bringing the stack up.

```bash
# Build
docker build -t forkit-site:latest \
  --build-arg NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com \
  --build-arg NEXT_PUBLIC_SOLANA_NETWORK=devnet \
  --build-arg NEXT_PUBLIC_BASE_URL=https://your-host.example \
  .

# Run — point DATABASE_URL at any Postgres, mount uploads volume
docker run --rm -p 3000:3000 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e DATABASE_URL=postgresql://user:pass@host/db?sslmode=require \
  -e DIRECT_URL=postgresql://user:pass@host/db?sslmode=require \
  -v forkit-uploads:/app/public/uploads \
  forkit-site:latest
```

Podman works identically — swap `docker` for `podman`.

#### docker compose / podman compose

`compose.yaml` wires up forkit-site and includes the Rust `forkme-mcp` server behind the `mcp` profile so you can bring the whole stack up with one command.

```bash
# At minimum, JWT_SECRET + DATABASE_URL in a local .env next to compose.yaml
cat > .env <<EOF
JWT_SECRET=$(openssl rand -hex 32)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host/db?sslmode=require
EOF

# forkit-site only
docker compose up --build

# forkit-site + Rust MCP server
docker compose --profile mcp up --build
```

### 3. Kubernetes

Manifests in `k8s/` cover Namespace, ConfigMap, Secret (template), PVC for uploads, Deployment, Services (ClusterIP + LoadBalancer), and an optional Ingress. Everything lives in the shared `forkit` namespace so it can sit next to `forkme` and `forkme-mcp`.

```bash
# Build and push to your registry
docker build -t registry.example.com/forkit-site:v1.0.0 .
docker push registry.example.com/forkit-site:v1.0.0

# Create the JWT secret + DB URL (do not commit values)
kubectl create namespace forkit
kubectl create secret generic forkit-site-secret \
  --from-literal=JWT_SECRET=$(openssl rand -hex 32) \
  --from-literal=DATABASE_URL=postgresql://user:pass@host/db?sslmode=require \
  --from-literal=DIRECT_URL=postgresql://user:pass@host/db?sslmode=require \
  -n forkit

# Apply the bundle
kubectl apply -k k8s/
```

Notes:

- **Replicas** — Next.js is stateless and the database is external Postgres, so the Deployment can be scaled horizontally. Uploads on a ReadWriteMany volume (or S3-compatible Blob) keep replicas consistent.
- **Persistent storage** — `forkit-site-uploads` (RWX, 10 Gi) for user-uploaded images. On managed clusters without RWX, point uploads at S3-compatible object storage instead.
- **Ingress** — nginx-ingress example; uncomment `ingress.yaml` in `kustomization.yaml` and set your host + TLS secret.

### 4. MCP Server (Rust, optional)

The `mcp-server/` directory ships its own OCI container pipeline (`Dockerfile` + `Containerfile` + `compose.yaml` + `k8s/`) for exposing the ForkIt API to AI agents over stdio or SSE. See `mcp-server/README.md` or run:

```bash
cd mcp-server
docker compose up --build
```

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
- Only UI chrome is translated — merchant-created content (menu/catalog items, descriptions) stays in the owner's language

To add a new language:
1. Create `messages/<code>.json` with all translation keys
2. Add the locale code to the `locales` array in `i18n.ts`

---

## Templates & Custom Branding

Five storefront options, each providing a different theme/layout:

| Template | Vibe |
|----------|------|
| **Classic Bistro** | Warm, earthy tones. Family eateries, trattorias, neighborhood bakers |
| **Modern Minimal** | Clean white space. Cafés, juice bars, indie boutiques |
| **Street Food** | Vibrant, colorful. Food trucks, taco joints, market stalls |
| **Fine Dining** | Dark, elegant. Upscale restaurants, wine bars, florists |
| **Custom** | Bring-your-own — pick every color and font yourself |

### Custom Branding

Merchants can override template defaults:

- **3 custom hex colors** — Primary (buttons/headings), Secondary (backgrounds), Accent (text/details)
- **8 curated palette presets** — Warm Classic, Forest & Cream, Ocean Blue, Rose Gold, Minimal Mono, Sunset, Matcha, Midnight Wine
- **26 open-source Google Fonts** across 5 categories:
  - **Sans-serif**: Inter, Poppins, Montserrat, Raleway, Nunito, Work Sans, DM Sans, Quicksand
  - **Serif**: Playfair Display, Merriweather, Lora, Cormorant Garamond, Libre Baskerville, Crimson Text
  - **Display**: Bebas Neue, Abril Fatface, Righteous, Lobster, Pacifico, Amatic SC, Fredoka
  - **Handwriting**: Dancing Script, Caveat, Kalam, Satisfy
  - **Monospace**: JetBrains Mono, Space Mono
- **Live preview** updates as you pick colors and fonts
- **Drag-to-reorder menu items** — arrange your catalog in any order; saves automatically

All fonts are licensed under SIL Open Font License (OFL) or Apache 2.0.

---

## Related Repos

| Repo | Description |
|------|-------------|
| [forkit](https://github.com/douglasdemaio/forkit) | Protocol — Solana programs (escrow, registry, loyalty, token), Express backend, test suite |
| [forkme](https://github.com/douglasdemaio/forkme) | Mobile companion — React Native (Expo), iOS/Android customer + driver apps |
| [forkit-site (zola-site branch)](https://github.com/douglasdemaio/forkit-site/tree/zola-site) | Marketing landing page (Zola static site, served from GitHub Pages) |

---

## Order Status Values

Order statuses mirror the on-chain `OrderStatus` enum exactly (shared between forkit-site, the forkme mobile app, and the Anchor program):

| Status | Description |
|--------|-------------|
| `Created` | Order placed, awaiting funding |
| `Funded` | Escrow fully funded, ready for the merchant |
| `Preparing` | Merchant accepted; preparing the order; drivers may bid |
| `ReadyForPickup` | Order ready; driver assigned (bid accepted) |
| `PickedUp` | Driver confirmed pickup (Code A verified) |
| `Delivered` | Delivery confirmed (Code B verified) |
| `Settled` | Funds distributed atomically on-chain |
| `Disputed` | Customer escalated after delivery timeout |
| `Cancelled` | Cancelled within 60-second window |
| `Refunded` | Timeout or dispute resolved as refund |

---

## Feature Highlights

- 🏪 **Vendor-aware onboarding** — restaurant / home_cook / retail tunes defaults (e.g. home kitchens default to pickup-only)
- 🗂 **Category cascade** — seven top-level groups with subcategories, validated against `lib/taxonomy.ts`
- 📍 **Draggable map pin** — MapLibre + Nominatim geocode (forward from address, reverse from drag); coords persisted on `Merchant.latitude/longitude`
- 🚗 **Driver bidding** — drivers bid an amount; merchant picks the lowest; on-chain `update_delivery_amount` refunds the customer the difference
- 🎨 **Custom branding** — 3 hex colors + 26 Google Fonts with live preview
- ☰ **Drag-and-drop menu reordering** — powered by @dnd-kit
- 🔐 **Order code verification** — merchant closes out orders via QR scan or manual code entry
- 🏬 **Multi-storefront support** — run multiple locations from one wallet, independent branding/menu/pin per location
- 📍 **Expanded address form** — separate Street, Apt, City, ZIP, State/Province, Country fields; country auto-populated from timezone (independent of UI language)
- 💎 **Separate payout wallet** — on-chain audit via `PayoutWalletChanged` event
- ⚡ **Post-funding contributions** — friends can chip in to reimburse the original payer after the order is funded
- ⏰ **Scheduled orders** — set a preferred delivery or pickup time, or leave blank for ASAP
- 🌍 **10 languages** with full RTL for Arabic
- 🖥 **Kiosk mode** — full-screen QR display for drivers to scan at pickup
- 🚦 **Pickup vs Delivery toggle** — waives delivery fee when customer selects pickup
- 🖼 **Server-side image resize** via `sharp` (native binary rebuilt in the container build stage)
- 🔗 **Social preview** — og:image and twitter:card metadata for proper link previews

---

## Phase 2 (Planned)

These features are referenced in UI copy or have partial on-chain stubs but are **not yet fully implemented**:

- **Loyalty tier discounts** (Bronze → Platinum, 5–20% fee reduction) — contract stub in the Loyalty program; tier logic + the `$FORKIT` token are pending
- **AI-routed delivery bonus points** (+50%) — referenced in UI copy; no routing system is implemented yet
- **Surge pricing UI** — the `set_surge_pricing` instruction exists on-chain, but no admin UI is included in this repo yet
- **Age-restricted goods** (alcohol, tobacco, cannabis, prescription pharmacy) — out of scope pending a future compliance spec

---

## License

MIT
