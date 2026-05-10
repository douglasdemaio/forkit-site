# Merchant Foundation — Design Spec

**Date:** 2026-05-10
**Status:** Approved for implementation planning
**Repos affected:** `forkit` (Anchor `forkit_registry`), `forkit-site`, `forkme`

## Problem

ForkIt currently models a single merchant type — restaurants — at every layer of the stack. The on-chain `forkit_registry::Role` enum is `{Restaurant, Driver, Customer}`. The forkit-site Postgres schema has a `Restaurant` model with text-only addresses, free-text menu-item categories, and no merchant-level taxonomy. The forkme PWA homepage is a flat text-search list of `RestaurantCard`s.

The product needs to expand to home-cook food sharing and any local retail (groceries, bookstores, hardware, florists, etc.). To do that, customers need map-based discovery and category filtering, and merchants need a category they can place themselves into. None of those features can ship before the data model accepts non-restaurant merchants and stores precise coordinates for them.

This spec defines the **foundation** for that expansion: a generalised `Merchant` data model with vendor type, hierarchical categories, and lat/lng — plus an updated onboarding form that captures all three. It is **the prerequisite for** Spec 2 (customer-facing map + category filter discovery) and Spec 3 (post-delivery rating input + on-chain trust-score badge UI), each of which will be brainstormed separately.

## Goals

- Rename the `Restaurant` data model to `Merchant` across forkit-site Postgres, forkit-site API endpoints, forkit-site dashboard copy, and forkme client types.
- Rename the on-chain `Role::Restaurant` variant to `Role::Merchant` and redeploy `forkit_registry` on devnet, with zero existing-account migration.
- Add `vendorType`, `pickupOnly`, `category`, `subcategory`, `latitude`, and `longitude` columns to the renamed `Merchant` table.
- Add a curated category taxonomy (7 top-level groups, 29 subcategories) as a TypeScript constant in `lib/taxonomy.ts`.
- Update merchant onboarding to capture vendor type, category cascade, and a drag-pin map for precise location, with Nominatim-based address geocoding through a server-side proxy.
- Backfill existing merchant rows with sensible restaurant-shaped defaults and geocode their addresses.
- Surface vendor-type-aware user-facing labels ("Restaurant" / "Kitchen" / "Shop") in all 10 supported locales.

## Non-goals

- Customer-facing map UI, category filter chips, or any change to the forkme homepage layout — **deferred to Spec 2.**
- On-chain trust-score badge display, post-delivery rating input prompt, or any change to how ratings are collected — **deferred to Spec 3.**
- Age verification or regional licensing for regulated merchants. The taxonomy intentionally **excludes** alcohol, tobacco, cannabis, and pharmacies/drugstores; those will be addressed in a separate compliance spec if and when they enter scope.
- Self-hosted Nominatim or LocationIQ migration. Devnet uses public Nominatim with rate-limit handling; production migration is future work.
- Inventory-management UI changes for retail merchants. Existing `MenuItem` model carries retail products in v1.
- New dashboard templates for non-restaurant merchants. The four existing templates remain available to all vendor types in v1.
- forkme UI changes beyond data-shape passthrough.

## Design decisions

| Decision | Choice | Rationale |
|---|---|---|
| On-chain Role rename | `Role::Restaurant` → `Role::Merchant`, redeploy on devnet | Long-term naming clarity. Zero account migration because variant byte 0 is unchanged. |
| Map + geocoding provider | MapLibre GL JS + OpenStreetMap Nominatim | Zero-cost, no API keys, MIT-licensed; aligns with the protocol's open-source ethos. LocationIQ flagged as production drop-in for Nominatim if rate limits become a problem. |
| Customer location source | HTML5 geolocation, manual postal-code/address fallback | Standard pattern; respects privacy via permission prompt; manual fallback covers denial. (Used by Spec 2; data shape captured here for completeness.) |
| Merchant location capture | Geocode typed address, drop pin, allow drag to refine | Address-first matches merchant mental model; drag-pin handles bad geocodes and fine-tuning. |
| Pin-drag behaviour | Updates lat/lng only; never reverse-geocodes back to address fields | Lets the merchant keep a printed/receipt address distinct from the actual pickup pin (loading dock, secondary entrance). |
| Vendor type triple | `restaurant` / `home_cook` / `retail` | Drives onboarding defaults (`pickupOnly`, driver-bidding eligibility, menu-structure hint) without locking the merchant in — every default is overrideable. |
| Category taxonomy | Hardcoded TS const, 7 top-level / 29 subcategories | Curated; not user-extensible in v1. Stored as English strings in the DB; localised at render time. Can move to DB tables later if needed. |
| Rating UI surface | Trust-score badge (no public reviews) | Locked here for cross-spec consistency. Display itself is implemented in Spec 3. |
| Public URL strategy | `/merchants/[slug]` canonical; `/restaurants/[slug]` permanent alias | Existing QR codes pointing at `/restaurants/[slug]` keep resolving forever. Both URLs return identical 200 responses. |
| API endpoint strategy | Hard rename `/api/restaurants/*` → `/api/merchants/*` | We control both clients (forkit-site dashboard and forkme). Synced deploy, no alias overhead. |
| User-facing label | Vendor-type-aware: `merchant.label.restaurant` / `home_cook` / `retail` | A bookstore page reading "This Restaurant is closed" is broken. Three i18n keys per locale = 30 strings total. |

## Architecture

```
forkit_registry  ──[Role::Restaurant → Role::Merchant, redeploy]──▶  IDL regen
                                                                       │
forkit-site  ──[Prisma migration: Restaurant → Merchant + 6 fields]──▶ /api/merchants/*
   │                                                                       │
   ├── Onboarding form: vendor type + category cascade + drag-pin map     │
   └── /api/geocode (Nominatim proxy, rate-limited, in-memory cache)      │
                                                                            ▼
forkme  ──[type rename, IDL regen, REGISTRY_ROLE.Merchant]──▶  data-shape passthrough
```

The work fans out from one Prisma migration plus one Anchor redeploy. No new services, no new infrastructure beyond the `/api/geocode` route on forkit-site.

## Data model

### Prisma schema changes

The existing `Restaurant` model is renamed to `Merchant` and gains six fields:

```prisma
model Merchant {
  // Existing fields unchanged: id, wallet, payoutWallet, name, slug, description,
  // template, logo, banner, currency, deliveryFee, published, autoAcknowledge,
  // selfDelivery, addressStreet, addressCity, addressCountry, colorPrimary,
  // colorSecondary, colorAccent, fontFamily, createdAt, updatedAt.

  // NEW — vendor type drives onboarding defaults
  vendorType   String   @default("restaurant")              // restaurant | home_cook | retail
  pickupOnly   Boolean  @default(false)                     // home_cook defaults true at onboarding

  // NEW — category taxonomy (English strings, sourced from lib/taxonomy.ts)
  category     String   @default("Food & Beverage")
  subcategory  String   @default("Restaurants & fast food")

  // NEW — location for Spec 2 map discovery
  latitude     Float?
  longitude    Float?

  menuItems    MenuItem[]
  orders       Order[]

  @@index([wallet])
  @@index([category, subcategory])
  @@index([latitude, longitude])
}

model MenuItem {
  merchantId  String                                          // was restaurantId
  merchant    Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  // other fields unchanged
}

model Order {
  merchantId  String                                          // was restaurantId
  merchant    Merchant @relation(fields: [merchantId], references: [id])
  // other fields unchanged
}
```

### Vendor-type defaults

Vendor type sets the *initial* values of behaviour fields when the merchant first selects it. Every default is overrideable.

| `vendorType` | Sets `pickupOnly` to | Driver bidding eligible | Menu structure hint |
|---|---|---|---|
| `restaurant` | `false` | yes | full menu with sections |
| `home_cook` | `true` | no (override possible) | small fixed menu |
| `retail` | `false` | yes | inventory items |

### Category taxonomy

Sourced from `lib/taxonomy.ts`. 7 top-level groups, 29 subcategories. No regulated substances (alcohol, tobacco, cannabis, pharmacies-with-Rx are deliberately absent).

```ts
export const VENDOR_CATEGORIES = {
  'Food & Beverage': [
    'Restaurants & fast food',
    'Grocery & supermarkets',
    'Meal kit services',
    'Bakeries & desserts',
    'Coffee & juice bars',
  ],
  'Retail & Shopping': [
    'General merchandise',
    'Clothing & apparel',
    'Electronics & gadgets',
    'Toys & games',
    'Books & media',
    'Sporting goods',
  ],
  'Health & Wellness': [
    'Vitamins & supplements',
    'Medical supplies',
    'Pet food & supplies',
  ],
  'Home & Living': [
    'Furniture & décor',
    'Hardware & tools',
    'Cleaning supplies',
    'Office supplies',
    'Plants & gardening',
  ],
  'Beauty & Personal Care': [
    'Cosmetics & skincare',
    'Hair care products',
    'Fragrances',
  ],
  'Specialty / Niche': [
    'Florists',
    'Gift & subscription boxes',
    'Convenience stores',
    'Religious / cultural goods',
  ],
  'Business & Professional': [
    'Office & janitorial supplies',
    'Restaurant supply',
    'Printing & packaging',
  ],
} as const;

export const VENDOR_TYPES = ['restaurant', 'home_cook', 'retail'] as const;
```

The stored DB value is the English string. Localised labels are rendered at view time from `messages/*.json`. If a future taxonomy edit drops a subcategory while merchants are still using it, the stored string is preserved and rendered as-is until the merchant edits their listing — no data loss.

## On-chain rename and migration

### Source-level changes (one line in Rust)

| File | Change |
|---|---|
| `forkit/programs/forkit_registry/src/state.rs:82` | `Restaurant,` → `Merchant,` |
| `forkit-site/lib/types.ts:134` | `raterRole: "restaurant" \| "customer"` → `"merchant" \| "customer"` |
| `forkme/lib/constants.ts:78–83` | `REGISTRY_ROLE.Restaurant: 0` → `REGISTRY_ROLE.Merchant: 0` and the comment above it |
| Anchor IDL JSON | Auto-regenerated by `anchor build` — variant string flips |

### Wire compatibility

Anchor enums serialize as a single byte indexed by variant position. We are renaming variant 0 (`Restaurant`) to variant 0 (`Merchant`) — same byte. **Existing devnet `Profile` accounts with `role: 0` will deserialize as `Role::Merchant` after redeploy with zero account migration.** Driver and Customer variants are at positions 1 and 2 respectively and are unchanged.

### Postgres migration

Single Prisma migration `add_merchant_taxonomy_and_location`. All DDL is wrapped in one Postgres transaction (PostgreSQL DDL is transactional), so partial application is impossible.

```sql
ALTER TABLE "Restaurant" RENAME TO "Merchant";
ALTER TABLE "MenuItem" RENAME COLUMN "restaurantId" TO "merchantId";
ALTER TABLE "Order"    RENAME COLUMN "restaurantId" TO "merchantId";

ALTER TABLE "Merchant" ADD COLUMN "vendorType"  TEXT NOT NULL DEFAULT 'restaurant';
ALTER TABLE "Merchant" ADD COLUMN "pickupOnly"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Merchant" ADD COLUMN "category"    TEXT NOT NULL DEFAULT 'Food & Beverage';
ALTER TABLE "Merchant" ADD COLUMN "subcategory" TEXT NOT NULL DEFAULT 'Restaurants & fast food';
ALTER TABLE "Merchant" ADD COLUMN "latitude"    DOUBLE PRECISION;
ALTER TABLE "Merchant" ADD COLUMN "longitude"   DOUBLE PRECISION;

CREATE INDEX "Merchant_category_subcategory_idx" ON "Merchant"("category","subcategory");
CREATE INDEX "Merchant_latitude_longitude_idx"   ON "Merchant"("latitude","longitude");
```

The `DEFAULT` values are exactly the legacy-restaurant defaults. Every existing row backfills correctly without explicit `UPDATE` statements.

### Lat/lng backfill

A one-shot script `scripts/backfill-merchant-coords.ts`, run after migration:

- Iterate `Merchant` rows where `latitude IS NULL AND addressStreet IS NOT NULL`.
- For each, call Nominatim `/search?q=<street>, <city>, <country>` with `User-Agent: forkit-site/1.0 (admin@forkit.example)` (Nominatim ToS requires a real contact).
- Sleep 1.1 s between requests (public Nominatim rate limit is 1 req/sec).
- On success: update `latitude` and `longitude`.
- On no-result or error: log and skip. The merchant can correct manually from their dashboard.
- Rows with empty `addressStreet` are skipped silently.

Devnet currently has fewer than 100 merchant rows; the script runs in roughly 2 minutes.

### Deploy sequence

1. `anchor build && anchor deploy` for `forkit_registry` to devnet.
2. Copy regenerated IDL to `forkit-site/lib/registry-idl.json` and `forkme/lib/registry-idl.json`.
3. Update `REGISTRY_ROLE.Merchant` in both clients and the `raterRole` union in `forkit-site/lib/types.ts`.
4. `prisma migrate deploy` on the forkit-site database.
5. Run `scripts/backfill-merchant-coords.ts`.
6. Deploy forkit-site.
7. Deploy forkme.

Steps 1–3 and 4–7 are independent and may be parallelised across two engineers. Step 1 is the only deploy with rollback complexity (program upgrade authority must be intact); because variant byte 0 is unchanged, rollback to the prior binary is also safe at the on-chain level.

## Onboarding UX

The merchant dashboard's settings form gains three new field groups, inserted between the existing "branding" and "address" sections:

1. **Vendor type** — three radio cards (Restaurant / Home cook / Retail), one selected. Selecting a card sets sensible defaults for `pickupOnly` and the menu-structure hint, but does not lock the merchant out of overriding either.
2. **Category** — two cascading dropdowns side by side. The first lists the 7 top-level groups; the second lists the subcategories of whichever top-level is selected. Changing the top-level resets the subcategory to the first option in the new group. Both fields are required to publish.
3. **Address & location** — the existing address fields (street, apt, city, state, country) become the trigger for an embedded MapLibre map sitting directly below them. On `onBlur` of the country field (debounced 600 ms), the form calls `/api/geocode` with the assembled address, drops a pin at the result, and stores `latitude` / `longitude`. The merchant can drag the pin to any location to fine-tune. Pin drag updates `latitude` / `longitude` only — address fields are not modified. If a merchant later edits an address field and triggers another geocode, the new geocode result **overwrites the current pin position** (the merchant must drag again to restore a custom pin).

### Save preconditions

The "Save" button stays disabled until:

- A vendor type is selected.
- Both category levels are selected.
- `latitude` and `longitude` are non-null (either via geocoding or pin drop).

This applies to **every save**, including edits to a legacy merchant whose backfill skipped them (empty `addressStreet` rows). Such merchants must set address + pin before they can save any further change. The existing publish gate (at least one menu item) is unchanged.

## API endpoints, public URLs, and naming

### API endpoints

Hard rename in forkit-site of every route currently under `/api/restaurants/*`:

- `/api/restaurants` → `/api/merchants`
- `/api/restaurants/[id]` → `/api/merchants/[id]`
- `/api/restaurants/[id]/menu-items` → `/api/merchants/[id]/menu-items`
- `/api/restaurants/[id]/orders` → `/api/merchants/[id]/orders`
- Any other `/api/restaurants/*` subpath moves to the same shape under `/api/merchants/*`

The implementation plan will enumerate the full route list against current source. forkme's `lib/api.ts` is updated in lockstep and shipped together. No alias is kept on the API surface — `/api/restaurants/*` returns 404 after this ships.

A new endpoint `/api/geocode` is added. It accepts `{ q: string }`, calls Nominatim server-side, caches successful results in process memory keyed by the query string for 24 h, and returns `{ lat: number, lng: number, displayName: string } | { error: 'not_found' | 'rate_limited' | 'unavailable' }`. Rate-limit 429s from Nominatim are retried once after 1.2 s; a second 429 returns `{ error: 'rate_limited' }` to the client.

### Public URLs

`/merchants/[slug]` becomes the canonical merchant page. `/restaurants/[slug]` is preserved as a permanent alias — the same Next.js page component, the same data, both URLs returning identical 200 responses. No redirect. This protects every printed QR code, share link, and external bookmark from breaking.

The dashboard always generates `/merchants/[slug]` for new shares. Existing `/restaurants/[slug]` shares continue working indefinitely.

### User-facing copy

The user-facing label for a merchant is rendered from one of three i18n keys, picked at view time based on the merchant's `vendorType`:

- `merchant.label.restaurant` — e.g., "Restaurant" (en), "Restaurante" (es)
- `merchant.label.home_cook` — e.g., "Kitchen" (en), "Cocina" (es)
- `merchant.label.retail` — e.g., "Shop" (en), "Tienda" (es)

10 locales × 3 keys = 30 new translation strings. CI lints `messages/*.json` to confirm all three keys are present in every locale.

The dashboard logo and homepage copy that currently reads "Restaurant Builder" become "Merchant Builder" or the equivalent localised phrasing.

## Error handling

| Scenario | Behaviour |
|---|---|
| Nominatim returns no result for the typed address | Toast: "We couldn't find that address — drop a pin manually." Form is still saveable once the merchant drops a pin. |
| Nominatim returns 429 rate-limit on save | `/api/geocode` retries once after 1.2 s. On a second 429, returns 503 to the client; toast says "Geocoding is busy — drop a pin manually or try again in a minute." |
| Pin drag fires while a geocode request is in-flight | `AbortController` cancels the in-flight request. Pin position wins; geocode result is discarded. |
| Merchant tries to save without a pin or category | Inline field errors. Save button stays disabled until both are set. |
| Backfill script encounters a row with empty `addressStreet` | Skip silently and log. Merchant fixes from dashboard. Row remains publishable but is invisible on the (Spec 2) map until lat/lng is set. |
| Subcategory string in DB doesn't match taxonomy after a future taxonomy edit | Render the stored string as-is. Force the merchant to pick a valid subcategory on next edit. No data loss. |
| Anchor redeploy fails mid-flight | Program upgrade authority retains the previous binary on chain. `solana program close` is not invoked. Roll back by skipping client/IDL update; retry next attempt. No on-chain state changed because variant byte 0 is identical. |
| Prisma migration partially applied | Migration is one Postgres transaction. Either all renames + columns + indexes apply, or none do. |

## Testing

| Layer | Coverage |
|---|---|
| Anchor (`forkit_registry`) | Existing register / rate / update tests pass unchanged after the variant rename. Add one test asserting a Profile with `role: 0` deserialises as `Role::Merchant` and that re-serialisation produces an identical byte. |
| Prisma migration | Run `prisma migrate dev` against a copy of devnet's database; verify row count preserved, all foreign keys intact, defaults applied to existing rows, and both new indexes created. |
| Backfill script | Unit-test with a Nominatim mock returning success, no-result, and 429 sequences. Assert lat/lng updated, skipped, and retried respectively. Assert the 1.1 s sleep is observed (use a fake timer). |
| Onboarding form | Playwright e2e: fill required fields including the cascade, watch geocode trigger after country `onBlur`, drag the pin, save, reload — all values persist. Plus a "no-geocode-result" path that exercises manual pin drop. |
| API rename | Smoke test: `/api/merchants` returns the same shape `/api/restaurants` previously did, with the six new fields appended. forkme integration test hits the new URL end-to-end. |
| Public URL alias | Smoke test: `GET /restaurants/[slug]` and `GET /merchants/[slug]` both return 200 with identical HTML. |
| i18n | Lint step: assert every `messages/*.json` file contains `merchant.label.restaurant`, `merchant.label.home_cook`, and `merchant.label.retail`. CI fails if any locale is missing a key. |

## Out of scope (deferred specs)

| Feature | Owning spec |
|---|---|
| Customer-facing map view, category filter chips, "in your area" geolocation flow | Spec 2 — Discovery |
| Trust-score badge display on merchant cards and detail pages | Spec 3 — Trust |
| Post-delivery 1–5 star rating prompt | Spec 3 — Trust |
| Age-gating and regional licensing for regulated substances (alcohol, tobacco, cannabis, Rx) | Future compliance spec |
| Self-hosted Nominatim or LocationIQ migration | Future infrastructure spec |
| Inventory model that diverges from `MenuItem` for retail | Future merchant-tools spec |
| Per-vendor-type templates beyond the four existing options | Future merchant-tools spec |

## Open questions deferred to implementation planning

- Exact i18n string copy for `merchant.label.home_cook` and `merchant.label.retail` in the nine non-English locales (DE, ES, FR, JA, ZH, PT, KO, AR, TR) — needs a translator pass at implementation time.

The following have been **decided here** and are no longer open:

- `/api/geocode` cache: **in-process Map keyed by query string, 24 h TTL.** Redis-backed cache is future work and only revisited if multi-instance forkit-site deploys generate cache-coherence problems.
- Dashboard wordmark image ("Restaurant Builder"): **kept as-is in v1.** Visible text strings change to "Merchant Builder" via i18n, but the bitmap/SVG logo asset is not regenerated. Replacing the asset is tracked as future brand work.
