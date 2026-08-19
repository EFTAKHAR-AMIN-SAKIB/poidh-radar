/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: {
          bg: "#FAF9F5",
          ivory: "#F0EEE6",
          sand: "#EBDBBC",
          kraft: "#D4A27F",
          clay: "#CC785C",
          terracotta: "#D97757",
          border: "#E5E4DF",
          borderStrong: "#D1D0C9",
          ink: "#141413",
          muted: "#6B6B67",
          subtle: "#8E8E8A",
        },
        radar: {
          bg: "#FAF9F5",
          "bg-subtle": "#F0EEE6",
          surface: "#FFFFFF",
          "surface-elevated": "#F0EEE6",
          "surface-hover": "#EAE7DD",
          border: "#E5E4DF",
          "border-active": "#D97757",
          terracotta: "#D97757",
          clay: "#CC785C",
        },
      },
      boxShadow: {
        paper: "0 1px 3px rgba(20, 20, 19, 0.04), 0 1px 2px rgba(20, 20, 19, 0.02)",
        "paper-md": "0 4px 12px rgba(20, 20, 19, 0.05), 0 1px 3px rgba(20, 20, 19, 0.03)",
        "paper-lg": "0 10px 25px -3px rgba(20, 20, 19, 0.06), 0 4px 6px -2px rgba(20, 20, 19, 0.03)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
        serif: [
          "Georgia",
          "Cambria",
          "'Times New Roman'",
          "Times",
          "serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "'SF Mono'",
          "Menlo",
          "Consolas",
          "'Liberation Mono'",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
