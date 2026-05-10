// Permanent alias: pre-existing QR codes and shared links pointing at
// /restaurants/[slug] continue to resolve to the canonical merchant page.
// New shares always use /merchants/[slug].
export { default } from "../../merchants/[slug]/page";
