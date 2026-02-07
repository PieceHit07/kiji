/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        sidebar: "var(--color-sidebar)",
        surface: "var(--color-surface)",
        surface2: "var(--color-surface2)",
        accent: "var(--color-accent)",
        "accent-dark": "var(--color-accent-dark)",
        accent2: "var(--color-accent2)",
        warning: "var(--color-warning)",
        "on-accent": "var(--color-on-accent)",
        "text-primary": "var(--color-text-primary)",
        "text-dim": "var(--color-text-dim)",
        "text-bright": "var(--color-text-bright)",
        border: "var(--color-border)",
        "hover-subtle": "var(--color-hover-subtle)",
        "hover-strong": "var(--color-hover-strong)",
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', "sans-serif"],
        mono: ['"Space Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
