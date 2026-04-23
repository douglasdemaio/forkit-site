import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {locales, defaultLocale} from './i18n-config';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false
});

// Allowed origins for cross-site API requests (forkme and local dev).
// Add FORKME_URL to your environment to permit the production forkme origin.
function getAllowedOrigins(): string[] {
  const origins = [
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    'http://localhost:3001', // local forkme dev
  ];
  if (process.env.FORKME_URL) origins.push(process.env.FORKME_URL);
  return origins;
}

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins();
  const allowedOrigin =
    origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export default function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api')) {
    const origin = req.headers.get('origin');
    const corsHeaders = buildCorsHeaders(origin);
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
    const res = NextResponse.next();
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!_next|uploads|favicon.ico|.*\\..*).*)'],
};
