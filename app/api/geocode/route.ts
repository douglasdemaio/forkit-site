import { NextRequest, NextResponse } from "next/server";

type CacheEntry = {
  lat: number;
  lng: number;
  displayName: string;
  expiresAt: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "forkit-site/1.0 (admin@forkit.example)";

async function callNominatim(q: string): Promise<Response> {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(q)}`;
  return fetch(url, { headers: { "User-Agent": USER_AGENT } });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "missing_q" }, { status: 400 });
  }

  const now = Date.now();
  const cached = cache.get(q);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({
      lat: cached.lat,
      lng: cached.lng,
      displayName: cached.displayName,
    });
  }

  let res: Response;
  try {
    res = await callNominatim(q);
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1200));
    try {
      res = await callNominatim(q);
    } catch {
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    if (res.status === 429) {
      return NextResponse.json({ error: "rate_limited" }, { status: 503 });
    }
  }

  if (!res.ok) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { lat, lon, display_name } = data[0];
  const entry: CacheEntry = {
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    displayName: display_name,
    expiresAt: now + CACHE_TTL_MS,
  };
  cache.set(q, entry);

  return NextResponse.json({
    lat: entry.lat,
    lng: entry.lng,
    displayName: entry.displayName,
  });
}
