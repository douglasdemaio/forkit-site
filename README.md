# ForkIt Site — Restaurant Builder + Ordering Platform on Solana

A **Weebly-style restaurant website builder** with integrated ordering and **Solana payments**. Restaurant owners build beautiful pages in minutes. Customers order food and pay with USDC/EURC through on-chain escrow — with built-in bill splitting.

**Part of the ForkIt Protocol** — decentralized food delivery on Solana.

---

## What Is This?

ForkIt Site lets anyone create a professional restaurant page and start accepting crypto orders:

### For Restaurant Owners

1. **Connect** your Solana wallet (Phantom, Solflare)
2. **Choose a template** — Classic Bistro, Modern Minimal, Street Food, or Fine Dining
3. **Upload** food photos, set menu items with names, descriptions, and prices (USDC/EURC)
4. **Publish** your page — it's live and accepting orders instantly

### For Customers

1. **Browse** restaurant pages
2. **Add items** to your shopping cart
3. **Checkout** via the ForkIt smart contract (escrow-based payment on Solana)
4. **Split orders** with friends — share a link and up to 10 people can contribute
5. **Track** your order status in real-time

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
- **Customer deposit:** 2% (refundable on delivery)
- **Max contributors per order:** 10
- **Treasury:** `BiP5PJuUiXPYCFx98RMCGCnRhdUVrkxSke9C6y2ZohQ9`

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
│   ├── page.tsx                  # Landing page
│   ├── api/                      # API routes
│   │   ├── auth/                 # Wallet auth (nonce + verify)
│   │   ├── restaurants/          # CRUD restaurants + menus
│   │   ├── orders/               # Create orders + contributions
│   │   └── upload/               # Image upload
│   ├── restaurants/              # Public restaurant browsing
│   ├── dashboard/                # Owner dashboard (menu, template, orders)
│   ├── order/                    # Cart + order tracking
│   └── connect/                  # Wallet connection page
├── components/                   # React components
├── hooks/                        # Custom hooks (wallet, escrow, cart, orders)
├── lib/                          # Utilities (constants, db, auth, types, templates)
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

## Templates

Four built-in templates, each providing a different CSS theme/layout:

| Template | Vibe |
|----------|------|
| **Classic Bistro** | Warm, earthy tones. Family restaurants, trattorias |
| **Modern Minimal** | Clean white space. Cafés, health food, juice bars |
| **Street Food** | Vibrant, colorful. Food trucks, taco joints |
| **Fine Dining** | Dark, elegant. Upscale restaurants, wine bars |

---

## Related Repos

| Repo | Description |
|------|-------------|
| [forkit](https://github.com/douglasdemaio/forkit) | Protocol — Solana programs (escrow, registry, loyalty), Express backend, test suite |
| [forkme](https://github.com/douglasdemaio/forkme) | Mobile companion — React Native (Expo), iOS/Android customer + seeker apps |

---

## License

MIT
