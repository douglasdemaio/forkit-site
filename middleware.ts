import createMiddleware from 'next-intl/middleware';
import {locales, defaultLocale} from './i18n-config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  // Don't auto-detect language from Accept-Language header.
  // Users choose their language via the language switcher.
  localeDetection: false
});

export const config = {
  // Match all pathnames except for
  // - /api routes
  // - /_next (Next.js internals)
  // - /uploads, /favicon.ico, etc. (static files)
  matcher: ['/((?!api|_next|uploads|favicon.ico|.*\\..*).*)']
};
