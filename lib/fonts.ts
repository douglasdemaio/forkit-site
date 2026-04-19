// Curated list of open-source Google Fonts suitable for restaurant branding.
// All fonts listed are SIL Open Font License (OFL) or Apache 2.0.
export interface FontOption {
  name: string;
  category: "serif" | "sans-serif" | "display" | "handwriting" | "monospace";
  // URL-encoded form for Google Fonts API
  urlName: string;
  // CSS font stack including fallbacks
  stack: string;
}

export const FONTS: FontOption[] = [
  // Sans-serif (clean, modern)
  { name: "Inter", category: "sans-serif", urlName: "Inter", stack: "'Inter', system-ui, sans-serif" },
  { name: "Poppins", category: "sans-serif", urlName: "Poppins", stack: "'Poppins', system-ui, sans-serif" },
  { name: "Montserrat", category: "sans-serif", urlName: "Montserrat", stack: "'Montserrat', system-ui, sans-serif" },
  { name: "Raleway", category: "sans-serif", urlName: "Raleway", stack: "'Raleway', system-ui, sans-serif" },
  { name: "Nunito", category: "sans-serif", urlName: "Nunito", stack: "'Nunito', system-ui, sans-serif" },
  { name: "Work Sans", category: "sans-serif", urlName: "Work+Sans", stack: "'Work Sans', system-ui, sans-serif" },
  { name: "DM Sans", category: "sans-serif", urlName: "DM+Sans", stack: "'DM Sans', system-ui, sans-serif" },
  { name: "Quicksand", category: "sans-serif", urlName: "Quicksand", stack: "'Quicksand', system-ui, sans-serif" },

  // Serif (classic, elegant)
  { name: "Playfair Display", category: "serif", urlName: "Playfair+Display", stack: "'Playfair Display', Georgia, serif" },
  { name: "Merriweather", category: "serif", urlName: "Merriweather", stack: "'Merriweather', Georgia, serif" },
  { name: "Lora", category: "serif", urlName: "Lora", stack: "'Lora', Georgia, serif" },
  { name: "Cormorant Garamond", category: "serif", urlName: "Cormorant+Garamond", stack: "'Cormorant Garamond', Georgia, serif" },
  { name: "Libre Baskerville", category: "serif", urlName: "Libre+Baskerville", stack: "'Libre Baskerville', Georgia, serif" },
  { name: "Crimson Text", category: "serif", urlName: "Crimson+Text", stack: "'Crimson Text', Georgia, serif" },

  // Display (expressive, for a vibe)
  { name: "Bebas Neue", category: "display", urlName: "Bebas+Neue", stack: "'Bebas Neue', Impact, sans-serif" },
  { name: "Abril Fatface", category: "display", urlName: "Abril+Fatface", stack: "'Abril Fatface', Georgia, serif" },
  { name: "Righteous", category: "display", urlName: "Righteous", stack: "'Righteous', system-ui, sans-serif" },
  { name: "Lobster", category: "display", urlName: "Lobster", stack: "'Lobster', cursive" },
  { name: "Pacifico", category: "display", urlName: "Pacifico", stack: "'Pacifico', cursive" },
  { name: "Amatic SC", category: "display", urlName: "Amatic+SC", stack: "'Amatic SC', cursive" },
  { name: "Fredoka", category: "display", urlName: "Fredoka", stack: "'Fredoka', system-ui, sans-serif" },

  // Handwriting (warm, personal)
  { name: "Dancing Script", category: "handwriting", urlName: "Dancing+Script", stack: "'Dancing Script', cursive" },
  { name: "Caveat", category: "handwriting", urlName: "Caveat", stack: "'Caveat', cursive" },
  { name: "Kalam", category: "handwriting", urlName: "Kalam", stack: "'Kalam', cursive" },
  { name: "Satisfy", category: "handwriting", urlName: "Satisfy", stack: "'Satisfy', cursive" },

  // Monospace (techy)
  { name: "JetBrains Mono", category: "monospace", urlName: "JetBrains+Mono", stack: "'JetBrains Mono', monospace" },
  { name: "Space Mono", category: "monospace", urlName: "Space+Mono", stack: "'Space Mono', monospace" },
];

export function getFont(name: string | null | undefined): FontOption | null {
  if (!name) return null;
  return FONTS.find((f) => f.name === name) || null;
}

export function googleFontsUrl(names: string[]): string {
  // Only include fonts from our list (safety: don't allow arbitrary CSS injection)
  const valid = names
    .map((n) => FONTS.find((f) => f.name === n))
    .filter((f): f is FontOption => f !== null && f !== undefined);
  if (valid.length === 0) return "";
  const families = valid
    .map((f) => `family=${f.urlName}:wght@400;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
