// This file is intentionally empty — all pages are now under app/[locale]/
// The root page is handled by the locale middleware rewriting to /[locale]/page.tsx
// Keeping this file prevents Next.js from showing a 404 during build if middleware doesn't apply.

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/en");
}
