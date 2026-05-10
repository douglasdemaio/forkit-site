# Merchant Foundation — Implementation Plan

**Date:** 2026-05-10
**Spec:** `docs/superpowers/specs/2026-05-10-merchant-foundation-design.md`
**Repos:**
- `~/forkit/programs/forkit_registry` — Anchor registry program
- `~/forkit-site` — Next.js admin/ERP + Prisma + Postgres
- `~/forkme` — Next.js customer/driver app

## Order of operations

The plan front-loads independent, low-risk additions (taxonomy const, geocode endpoint, dependencies) so the team can work in parallel before the schema rename. The Prisma migration and the Anchor redeploy are the two coordination moments — everything else is one-repo-at-a-time work.

```
1.  Add lib/taxonomy.ts + i18n keys                      (forkit-site)        no deps
2.  Install MapLibre + add /api/geocode endpoint          (forkit-site)        no deps
3.  Anchor: rename Role::Restaurant → Role::Merchant     (forkit/programs)    no deps
4.  Anchor: redeploy to devnet + copy IDL                (forkit/programs)    depends on 3
5.  Prisma migration: Restaurant → Merchant + 6 fields    (forkit-site)        no deps
6.  Sweep Prisma client usages (model rename)             (forkit-site)        depends on 5
7.  Backfill script for lat/lng coords                    (forkit-site)        depends on 5, run after 5
8.  Onboarding: vendor-type radios + category cascade     (forkit-site)        depends on 1, 6
9.  Onboarding: drag-pin map component                    (forkit-site)        depends on 2, 6, 8
10. Vendor-type-aware label component                     (forkit-site, forkme) depends on 1, 6
11. Update REGISTRY_ROLE.Merchant in both clients         (forkit-site, forkme) depends on 4
12. API rename /api/restaurants/* → /api/merchants/*      (forkit-site)        depends on 6
13. /merchants/[slug] canonical + /restaurants/[slug] alias (forkit-site)      depends on 6, 12
14. forkme: lib/api.ts URL flip + IDL copy                (forkme)             depends on 11, 12
15. Synced deploy + e2e devnet smoke                      (all repos)          depends on all
```

Steps 1, 2, 3, 5 are independent and can run in parallel by separate engineers. Steps 1–14 produce a shippable interim state where the data model is generalised but the customer-facing map (Spec 2) and trust badges (Spec 3) have not yet shipped.

---

## Step 1 — Taxonomy const and i18n keys

**Files:**
- `forkit-site/lib/taxonomy.ts` (new)
- `forkit-site/messages/en.json` (and the nine other locale files)

Create `lib/taxonomy.ts` with the exact `VENDOR_CATEGORIES` and `VENDOR_TYPES` consts from the spec — 7 top-level groups, 29 subcategories.

Add three i18n keys to every locale:

```jsonc
"merchant": {
  "label": {
    "restaurant": "Restaurant",
    "home_cook":  "Kitchen",
    "retail":     "Shop"
  }
}
```

Translate for DE, ES, FR, JA, ZH, PT, KO, AR, TR (translator pass; reasonable machine-translation as placeholder is acceptable for v1).

**Verify:**
```bash
node -e "const t=require('./lib/taxonomy.ts'); console.log(Object.keys(t.VENDOR_CATEGORIES).length, Object.values(t.VENDOR_CATEGORIES).flat().length)"
# expect: 7 29

for f in messages/*.json; do
  jq -e '.merchant.label | (.restaurant and .home_cook and .retail)' "$f" > /dev/null \
    || echo "MISSING: $f"
done
# expect: no output
```

**Done when:** taxonomy module exports both consts; all 10 locale files contain the three label keys; no TypeScript errors.

---

## Step 2 — MapLibre dependency and `/api/geocode` endpoint

**Files:**
- `forkit-site/package.json`
- `forkit-site/app/api/geocode/route.ts` (new)

Install:
```bash
cd ~/forkit-site
npm install maplibre-gl
```

Create `app/api/geocode/route.ts`:
- Accept `GET /api/geocode?q=<address>`
- In-process `Map<string, { lat, lng, displayName, expiresAt }>`; 24 h TTL keyed on `q`
- On cache miss, call `https://nominatim.openstreetmap.org/search?format=json&q=<q>&limit=1` with `User-Agent: forkit-site/1.0 (admin@forkit.example)`
- Map response: `[{ lat, lon, display_name }]` → `{ lat: parseFloat(lat), lng: parseFloat(lon), displayName: display_name }`. Empty array → `{ error: 'not_found' }`
- On 429: wait 1.2 s and retry once. Second 429 → `{ error: 'rate_limited' }`. Other non-2xx → `{ error: 'unavailable' }`
- Return JSON; cache only successful hits

**Verify:**
```bash
curl 'http://localhost:3000/api/geocode?q=1600%20Pennsylvania%20Ave%20Washington%20DC'
# expect: {"lat":38.897..,"lng":-77.036..,"displayName":"..."}

curl 'http://localhost:3000/api/geocode?q=qqqzzzxxxnonexistentplace12345'
# expect: {"error":"not_found"}
```

**Done when:** both happy paths verified; cache observed (second identical request is sub-millisecond).

---

## Step 3 — Anchor: rename `Role::Restaurant` → `Role::Merchant`

**Files:**
- `forkit/programs/forkit_registry/src/state.rs:82`

Change `Restaurant,` to `Merchant,`. That's the only Rust source change.

**Verify:**
```bash
cd ~/forkit
anchor build
grep -n "Restaurant" programs/forkit_registry/src/  # expect: no matches
grep -n "\"Merchant\"" target/idl/forkit_registry.json  # expect: variant in Role enum
```

**Done when:** `anchor build` passes; IDL contains the renamed variant; no Rust references to `Restaurant` remain in the registry program.

---

## Step 4 — Anchor: redeploy and copy IDL

**Files:**
- `forkit-site/lib/registry-idl.json`
- `forkme/lib/registry-idl.json`

Run existing test suite, then deploy to devnet:
```bash
cd ~/forkit
anchor test                                            # all existing tests must pass
anchor deploy --provider.cluster devnet --program-name forkit_registry
cp target/idl/forkit_registry.json ~/forkit-site/lib/registry-idl.json
cp target/idl/forkit_registry.json ~/forkme/lib/registry-idl.json
```

Add one new Anchor test that registers a profile with `Role::Merchant` and asserts the on-chain account's `role` field deserialises identically to the byte that previously represented `Role::Restaurant` (variant 0).

**Verify:**
```bash
solana program show <REGISTRY_PROGRAM_ID> --url devnet
# expect: Last Deployed Slot is recent
```

**Done when:** program upgraded on devnet; IDL copied to both clients; new wire-compat test passes; existing test suite green.

---

## Step 5 — Prisma migration: rename + add fields

**Files:**
- `forkit-site/prisma/schema.prisma`
- `forkit-site/prisma/migrations/<timestamp>_add_merchant_taxonomy_and_location/`

Update `schema.prisma`: rename `model Restaurant` to `model Merchant`; rename foreign keys in `MenuItem` and `Order` from `restaurantId`/`restaurant` to `merchantId`/`merchant`; add the six new fields and two new indexes per the spec.

Generate migration:
```bash
cd ~/forkit-site
DATABASE_URL="postgresql://forkit:forkit@localhost:5432/forkit?schema=public" \
  npx prisma migrate dev --name add_merchant_taxonomy_and_location
```

Confirm the generated SQL matches the spec's migration block. Edit if Prisma chooses `DROP/ADD` instead of `RENAME` for the table — force `RENAME TO` so existing rows survive.

**Verify:**
```bash
podman exec forkit-site_db_1 psql -U forkit -d forkit -c "\d \"Merchant\""
# expect: vendorType, pickupOnly, category, subcategory, latitude, longitude columns

podman exec forkit-site_db_1 psql -U forkit -d forkit -c "\d \"MenuItem\""
# expect: merchantId column (not restaurantId)

podman exec forkit-site_db_1 psql -U forkit -d forkit -c \
  "SELECT count(*) FROM \"Merchant\" WHERE \"vendorType\"='restaurant';"
# expect: count == prior Restaurant row count
```

**Done when:** migration applied; defaults populated on existing rows; both new indexes created; no FK violations.

---

## Step 6 — Sweep Prisma client usages

**Files:** any TS file in `forkit-site/` that references `prisma.restaurant` or `restaurantId`

Find and replace:
```bash
cd ~/forkit-site
grep -rn "prisma\.restaurant\b" app/ lib/ scripts/
grep -rn "restaurantId" app/ lib/ scripts/
```

Rename:
- `prisma.restaurant` → `prisma.merchant`
- `restaurantId:` (when used as a Prisma input field name) → `merchantId:`
- TypeScript type imports `Restaurant` → `Merchant`
- API response field `restaurant` → `merchant` where the field is the relation, not the user-facing label
- Any zod schema field `restaurantId` → `merchantId`

This is mechanical but pervasive. Do it as one PR scoped to `forkit-site`. Do **not** touch user-facing strings yet (Step 10 handles that via the i18n label).

**Verify:**
```bash
cd ~/forkit-site
npm run typecheck    # zero errors
npm run build        # passes
```

**Done when:** typecheck and build pass; no remaining `prisma.restaurant` or stray `restaurantId` references in source.

---

## Step 7 — Backfill script for lat/lng

**Files:** `forkit-site/scripts/backfill-merchant-coords.ts` (new)

Implement per the spec:
- Iterate `prisma.merchant.findMany({ where: { latitude: null, NOT: { addressStreet: null } } })`
- For each, call public Nominatim `/search?q=<street>, <city>, <country>` with the required User-Agent
- `await sleep(1100)` between requests
- On success → `prisma.merchant.update`; on no-result/error → `console.warn` and skip
- Print summary: `{ total, updated, skipped, errored }`

**Verify (devnet DB):**
```bash
cd ~/forkit-site
DATABASE_URL=... npx tsx scripts/backfill-merchant-coords.ts
# expect: completes in ~2 minutes for <100 rows; reports counts

DATABASE_URL=... podman exec forkit-site_db_1 psql -U forkit -d forkit -c \
  "SELECT count(*) FROM \"Merchant\" WHERE latitude IS NOT NULL;"
# expect: ~most existing rows now have coords
```

**Done when:** script runs cleanly on a real devnet DB copy; lat/lng populated where addresses resolve; rows with empty street stay null without errors.

---

## Step 8 — Onboarding: vendor-type radios + category cascade

**Files:**
- `forkit-site/app/[locale]/dashboard/settings/page.tsx` (or wherever the merchant settings form lives)
- `forkit-site/components/dashboard/vendor-type-radios.tsx` (new)
- `forkit-site/components/dashboard/category-cascade.tsx` (new)

`<VendorTypeRadios>` — three labelled radio cards bound to `vendorType` form state. Selecting `home_cook` sets `pickupOnly` to `true` once; subsequent vendor-type changes do not touch `pickupOnly` again (manual toggle wins).

`<CategoryCascade>` — two `<select>` elements. First options come from `Object.keys(VENDOR_CATEGORIES)`. Second options come from `VENDOR_CATEGORIES[selectedTopLevel]`. Changing the first dropdown resets the second to `VENDOR_CATEGORIES[next][0]`.

Wire both into the existing dashboard settings form between branding and address sections.

**Verify:** open the dashboard, change vendor type → `pickupOnly` flips on first home_cook selection only. Change category top-level → subcategory list reflects the new group.

**Done when:** form persists `vendorType`, `pickupOnly`, `category`, `subcategory` correctly; category dropdown stays in sync.

---

## Step 9 — Onboarding: drag-pin map component

**Files:**
- `forkit-site/components/dashboard/location-map.tsx` (new)
- `forkit-site/app/[locale]/dashboard/settings/page.tsx`

`<LocationMap>` props: `{ lat, lng, onChange(lat, lng) }`. Renders a 220 px-tall MapLibre canvas with the OpenStreetMap raster tile source. A draggable marker is placed at `(lat, lng)` (or center-of-country fallback if both null). On `dragend`, fires `onChange` with the marker's new coords.

In the parent settings form: when the country field's `onBlur` fires (debounced 600 ms), call `/api/geocode?q=<assembled address>` via the existing api client. On `{ lat, lng }`, set form state for `latitude`/`longitude`. On `{ error }`, toast the user-facing message from the spec's error-handling table. Use `AbortController` to cancel in-flight geocode if the marker is dragged.

Save button stays disabled until `vendorType`, `category`, `subcategory`, `latitude`, `longitude` are all set.

**Verify:** Playwright smoke test:
- Fill address, blur country → pin appears at geocoded location
- Drag pin → form state lat/lng update; address fields unchanged
- Save → reload → all values persist

**Done when:** map renders; geocode triggers on country blur; pin drag updates lat/lng; save preconditions enforced; abort logic prevents stale geocode wins.

---

## Step 10 — Vendor-type-aware label component

**Files:**
- `forkit-site/components/merchant-label.tsx` (new)
- `forkme/components/merchant-label.tsx` (new)

A small component:
```tsx
export function MerchantLabel({ vendorType }: { vendorType: 'restaurant' | 'home_cook' | 'retail' }) {
  const { t } = useTranslation();
  return <>{t(`merchant.label.${vendorType}`)}</>;
}
```

Replace hard-coded "Restaurant" user-facing strings in dashboard headers, public pages, and forkme's `RestaurantCard` (which itself should be renamed `MerchantCard`).

**Verify:** view a `home_cook` merchant page in en, es, de — header reads "Kitchen" / "Cocina" / "Küche".

**Done when:** no hard-coded "Restaurant" strings appear in app/components source; all vendor-type variants render correctly in 3 spot-checked locales.

---

## Step 11 — Update `REGISTRY_ROLE.Merchant` in both clients

**Files:**
- `forkit-site/lib/types.ts:134`
- `forkme/lib/constants.ts:78–83`

In `forkit-site/lib/types.ts`, change the `raterRole` union from `"restaurant" | "customer"` to `"merchant" | "customer"`. Update any string-comparison sites that branch on `raterRole === "restaurant"`.

In `forkme/lib/constants.ts`:
```ts
// Registry Role enum (matches on-chain: Merchant=0, Driver=1, Customer=2)
export const REGISTRY_ROLE = {
  Merchant: 0,
  Driver:   1,
  Customer: 2,
} as const;
```

Update any callsite that imports `REGISTRY_ROLE.Restaurant`.

**Verify:**
```bash
cd ~/forkit-site && grep -rn "REGISTRY_ROLE\.Restaurant\|raterRole.*restaurant" app/ lib/
# expect: no matches
cd ~/forkme && grep -rn "REGISTRY_ROLE\.Restaurant" app/ lib/ components/
# expect: no matches
```

**Done when:** both repos typecheck; existing on-chain reads still parse correctly (verified manually against a devnet Profile).

---

## Step 12 — API rename `/api/restaurants/*` → `/api/merchants/*`

**Files:** every `forkit-site/app/api/restaurants/**/route.ts`

Move each `route.ts` from `app/api/restaurants/<path>/route.ts` to `app/api/merchants/<path>/route.ts`. Delete the empty `restaurants` directory. The file contents change only where they reference the renamed Prisma model (already done in Step 6) and where they construct response field names (`restaurant` → `merchant` in nested relation fields).

**Verify:**
```bash
cd ~/forkit-site
grep -rln "/api/restaurants" app/ lib/  # expect: no matches in source
curl http://localhost:3000/api/merchants               # expect: 200, list of merchants with new fields
curl http://localhost:3000/api/restaurants             # expect: 404
```

**Done when:** all route files moved; old paths return 404; new paths return identical-shape responses with the six new fields appended.

---

## Step 13 — Public URL: `/merchants/[slug]` canonical + `/restaurants/[slug]` alias

**Files:**
- `forkit-site/app/[locale]/merchants/[slug]/page.tsx` (new — copies the existing restaurants page)
- `forkit-site/app/[locale]/restaurants/[slug]/page.tsx` (becomes a re-export of the merchants page)

Move the rendering logic into `app/[locale]/merchants/[slug]/page.tsx`. In `app/[locale]/restaurants/[slug]/page.tsx`, simply re-export:

```tsx
export { default, generateMetadata } from "../merchants/[slug]/page";
```

This keeps existing QR codes resolving forever to the same component, identical HTML output. The dashboard's "share" link generator switches to `/merchants/[slug]`.

**Verify:**
```bash
diff <(curl -s http://localhost:3000/restaurants/<slug>) \
     <(curl -s http://localhost:3000/merchants/<slug>)
# expect: identical (modulo whatever the locale path adds)
```

**Done when:** both URLs return identical 200 responses; new dashboard shares use `/merchants/`.

---

## Step 14 — forkme: API client URL flip + IDL copy

**Files:**
- `forkme/lib/api.ts`
- `forkme/lib/registry-idl.json` (already copied in Step 4)

Find every `fetch(\`${API_URL}/api/restaurants...\`)` in `lib/api.ts` and rename to `/api/merchants`. Also rename TypeScript types: `RestaurantData` → `MerchantData`. The previously-named `RestaurantCard` component renames to `MerchantCard` (already partially handled in Step 10).

**Verify:**
```bash
cd ~/forkme
grep -rn "/api/restaurants\|RestaurantData\b" app/ lib/ components/
# expect: no matches
npm run typecheck && npm run build
# expect: passes
```

**Done when:** forkme builds against the new API surface; no stale `RestaurantData` or `/api/restaurants` references; runtime smoke test (browse merchants, place order) works against a forkit-site running Step 12.

---

## Step 15 — Synced deploy + e2e devnet smoke test

**Order:**
1. Deploy `forkit-site` (carries the API rename + Prisma migration + onboarding form)
2. Deploy `forkme` (consumes the new API)
3. Smoke test on devnet:
   - Register a new merchant with `vendorType=home_cook`, category Food & Beverage / Bakeries — verify Profile account has `role=0` decoding as Merchant
   - Onboard with a real address — verify pin auto-drops, drag updates lat/lng without changing address fields, save persists all six new fields
   - Create a menu item, publish, place an order from forkme as a customer
   - Confirm pickup, confirm delivery — escrow settles
   - Existing `/restaurants/<slug>` URL of a legacy merchant still 200s

**Verify:** all steps in the smoke test pass; error logs clean; existing devnet bid + delivery flows unaffected.

**Done when:** end-to-end customer→merchant→driver flow works across the renamed stack; legacy URLs and on-chain accounts continue to function; both repos deployed and stable on devnet.

---

## Rollback

| Failure | Recovery |
|---|---|
| Step 4 (Anchor deploy) fails mid-flight | Program upgrade authority retains prior binary; skip Steps 11+ until redeploy succeeds. |
| Step 5 (Prisma migration) fails | One Postgres transaction — full rollback automatic. Investigate, fix migration SQL, re-run. |
| Step 7 (backfill) errors | Idempotent — re-run after fix. Existing `latitude IS NOT NULL` rows are skipped. |
| Step 12/14 (API rename) ships out of sync | Revert deploy on whichever repo went first; the alias-free API rename means a 30-second window of 404s if forkme hits the old URL. Mitigation: deploy forkit-site first, observe healthy `/api/merchants` traffic, then deploy forkme. |
| Step 13 (URL alias) breaks legacy share links | Confirm the re-export is in place; both routes must return 200. If broken, revert this step only — earlier steps are independent. |
