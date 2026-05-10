/**
 * Backfill latitude/longitude on existing Merchant rows by geocoding
 * their stored address through the public Nominatim service.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/backfill-merchant-coords.ts
 *
 * Nominatim public-service constraints:
 *   - Maximum 1 request per second
 *   - User-Agent header must be set with a real contact
 *
 * Behaviour per row:
 *   - latitude IS NOT NULL                          -> skip silently
 *   - addressStreet IS NULL or empty                -> skip silently
 *   - geocode hit                                   -> update lat/lng
 *   - geocode miss / 4xx / network error            -> log and continue
 *
 * Idempotent: re-running only touches rows that still have null lat/lng.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "forkit-site/1.0 (admin@forkit.example)";
const REQUEST_INTERVAL_MS = 1100;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type GeocodeResult =
  | { kind: "ok"; lat: number; lng: number; displayName: string }
  | { kind: "not_found" }
  | { kind: "error"; reason: string };

async function geocode(q: string): Promise<GeocodeResult> {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(q)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  } catch (err) {
    return { kind: "error", reason: `network: ${(err as Error).message}` };
  }
  if (!res.ok) {
    return { kind: "error", reason: `http ${res.status}` };
  }
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  if (!Array.isArray(data) || data.length === 0) {
    return { kind: "not_found" };
  }
  const [first] = data;
  return {
    kind: "ok",
    lat: parseFloat(first.lat),
    lng: parseFloat(first.lon),
    displayName: first.display_name,
  };
}

async function main() {
  const rows = await prisma.merchant.findMany({
    where: { latitude: null, NOT: { addressStreet: null } },
    select: {
      id: true,
      name: true,
      addressStreet: true,
      addressCity: true,
      addressCountry: true,
    },
  });

  console.log(`Found ${rows.length} merchant(s) needing geocoding.`);

  let updated = 0;
  let skipped = 0;
  let errored = 0;

  for (const row of rows) {
    if (!row.addressStreet || row.addressStreet.trim() === "") {
      skipped++;
      continue;
    }

    const parts = [row.addressStreet, row.addressCity, row.addressCountry]
      .filter((p): p is string => !!p && p.trim() !== "")
      .join(", ");

    const result = await geocode(parts);

    if (result.kind === "ok") {
      await prisma.merchant.update({
        where: { id: row.id },
        data: { latitude: result.lat, longitude: result.lng },
      });
      console.log(`  ✓ ${row.name}: ${result.lat}, ${result.lng}`);
      updated++;
    } else if (result.kind === "not_found") {
      console.warn(`  ✗ ${row.name}: no result for "${parts}"`);
      skipped++;
    } else {
      console.error(`  ✗ ${row.name}: ${result.reason}`);
      errored++;
    }

    await sleep(REQUEST_INTERVAL_MS);
  }

  console.log(`\nSummary: total=${rows.length} updated=${updated} skipped=${skipped} errored=${errored}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
