import { TemplateDefinition } from "./types";

export const templates: TemplateDefinition[] = [
  {
    id: "classic-bistro",
    name: "Classic Bistro",
    description:
      "Warm, traditional look with earthy tones. Perfect for family merchants, trattorias, and cozy bistros.",
    preview: "/templates/classic-bistro.svg",
    colors: {
      primary: "#8B4513",
      secondary: "#D2691E",
      background: "#FFF8F0",
      text: "#2C1810",
      accent: "#DAA520",
    },
    font: "Georgia, serif",
  },
  {
    id: "solana-vibes",
    name: "Solana Vibes",
    description:
      "Inspired by the Solana ecosystem — deep indigo meets vibrant purple-green gradients. Great for modern crypto-savvy merchants.",
    preview: "/templates/solana-vibes.svg",
    colors: {
      primary: "#9945FF",
      secondary: "#14F195",
      background: "#0F0B24",
      text: "#FFFFFF",
      accent: "#19FB9B",
    },
    font: "Inter, system-ui, sans-serif",
  },
  {
    id: "cyber-snack",
    name: "Cyber Snack",
    description:
      "Neon accents on dark canvas with teal and cyan highlights. Ideal for bubble tea shops, ramen bars, and late-night spots.",
    preview: "/templates/cyber-snack.svg",
    colors: {
      primary: "#00D4AA",
      secondary: "#0D1B2A",
      background: "#0A0A0A",
      text: "#E0E0E0",
      accent: "#80FFDB",
    },
    font: "'Space Grotesk', sans-serif",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description:
      "Clean lines and generous white space. Ideal for health-conscious eateries, juice bars, and cafés.",
    preview: "/templates/modern-minimal.svg",
    colors: {
      primary: "#1A1A1A",
      secondary: "#666666",
      background: "#FFFFFF",
      text: "#1A1A1A",
      accent: "#FF6B35",
    },
    font: "Inter, system-ui, sans-serif",
  },
  {
    id: "street-food",
    name: "Street Food",
    description:
      "Vibrant, colorful, and full of energy. Great for food trucks, taco joints, and casual takeaway spots.",
    preview: "/templates/street-food.svg",
    colors: {
      primary: "#FF6B35",
      secondary: "#FFD700",
      background: "#1A1A2E",
      text: "#FFFFFF",
      accent: "#2ECC71",
    },
    font: "'Fredoka One', cursive, sans-serif",
  },
  {
    id: "fine-dining",
    name: "Fine Dining",
    description:
      "Elegant dark theme with refined typography. Suited for upscale merchants, wine bars, and tasting menus.",
    preview: "/templates/fine-dining.svg",
    colors: {
      primary: "#C9A96E",
      secondary: "#8B7355",
      background: "#0D0D0D",
      text: "#E8E0D5",
      accent: "#C9A96E",
    },
    font: "'Playfair Display', serif",
  },
  {
    id: "custom",
    name: "Custom",
    description:
      "Start from scratch. Your chosen colors and font are used as-is with no template defaults.",
    preview: "/templates/custom.svg",
    colors: {
      primary: "#f9a825",
      secondary: "#0d1421",
      background: "#ffffff",
      text: "#111111",
      accent: "#ffffff",
    },
    font: "Inter, system-ui, sans-serif",
  },
];

export function getTemplate(id: string): TemplateDefinition {
  return templates.find((t) => t.id === id) || templates[0];
}

export function getTemplateStyles(id: string): React.CSSProperties {
  const template = getTemplate(id);
  return {
    "--color-primary": template.colors.primary,
    "--color-secondary": template.colors.secondary,
    "--color-background": template.colors.background,
    "--color-text": template.colors.text,
    "--color-accent": template.colors.accent,
    "--font-family": template.font,
    fontFamily: template.font,
    backgroundColor: template.colors.background,
    color: template.colors.text,
  } as React.CSSProperties;
}
