import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF8F4",
        surface: "#FFFFFF",
        stone: "#E5E1D8",
        charcoal: "#1F1D1A",
        muted: "#6B665C",
        severity: {
          high: "#B5483A",
          moderate: "#B7791F",
          low: "#5B6B3A",
          indeterminate: "#8A857A",
        },
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(31, 29, 26, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
