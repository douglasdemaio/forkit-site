import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forkit: {
          orange: "#FF6B35",
          dark: "#1A1A2E",
          purple: "#6C63FF",
          green: "#2ECC71",
          cream: "#FFF8F0",
        },
        solana: {
          purple: "#9945FF",
          green: "#14F195",
          dark: "#0F0B24",
          magenta: "#E33EFF",
          teal: "#00D4AA",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Cal Sans", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
