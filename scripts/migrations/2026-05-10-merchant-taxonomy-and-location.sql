-- Migration: rename Restaurant -> Merchant, add taxonomy + location columns
-- Date: 2026-05-10
-- Spec: docs/superpowers/specs/2026-05-10-merchant-foundation-design.md
--
-- Apply this manually with `psql $DATABASE_URL -f scripts/migrations/2026-05-10-merchant-taxonomy-and-location.sql`
-- BEFORE running `prisma db push` or `prisma migrate dev`. If you let Prisma
-- generate the migration first, it may emit DROP+CREATE for the table rename
-- which would lose all rows. The explicit SQL here uses ALTER TABLE RENAME
-- so existing rows are preserved.
--
-- All DDL is wrapped in a single transaction so partial application is impossible.

BEGIN;

-- Rename table and foreign-key columns
ALTER TABLE "Restaurant" RENAME TO "Merchant";
ALTER TABLE "MenuItem"   RENAME COLUMN "restaurantId" TO "merchantId";
ALTER TABLE "Order"      RENAME COLUMN "restaurantId" TO "merchantId";

-- Rename indexes that reference the old name (Postgres auto-named them)
ALTER INDEX IF EXISTS "Restaurant_pkey"          RENAME TO "Merchant_pkey";
ALTER INDEX IF EXISTS "Restaurant_slug_key"      RENAME TO "Merchant_slug_key";
ALTER INDEX IF EXISTS "Restaurant_wallet_idx"    RENAME TO "Merchant_wallet_idx";
ALTER INDEX IF EXISTS "MenuItem_restaurantId_idx" RENAME TO "MenuItem_merchantId_idx";
ALTER INDEX IF EXISTS "Order_restaurantId_idx"    RENAME TO "Order_merchantId_idx";

-- Rename foreign-key constraints
ALTER TABLE "MenuItem" RENAME CONSTRAINT "MenuItem_restaurantId_fkey" TO "MenuItem_merchantId_fkey";
ALTER TABLE "Order"    RENAME CONSTRAINT "Order_restaurantId_fkey"    TO "Order_merchantId_fkey";

-- New columns with safe defaults (legacy rows backfill as restaurants)
ALTER TABLE "Merchant" ADD COLUMN "vendorType"  TEXT    NOT NULL DEFAULT 'restaurant';
ALTER TABLE "Merchant" ADD COLUMN "pickupOnly"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Merchant" ADD COLUMN "category"    TEXT    NOT NULL DEFAULT 'Food & Beverage';
ALTER TABLE "Merchant" ADD COLUMN "subcategory" TEXT    NOT NULL DEFAULT 'Restaurants & fast food';
ALTER TABLE "Merchant" ADD COLUMN "latitude"    DOUBLE PRECISION;
ALTER TABLE "Merchant" ADD COLUMN "longitude"   DOUBLE PRECISION;

-- New indexes for category filter (Spec 2) and bounding-box queries (Spec 2)
CREATE INDEX "Merchant_category_subcategory_idx" ON "Merchant" ("category", "subcategory");
CREATE INDEX "Merchant_latitude_longitude_idx"   ON "Merchant" ("latitude", "longitude");

COMMIT;
