/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08080d",
        sidebar: "#0c0c14",
        surface: "#111119",
        surface2: "#181822",
        surface3: "#1e1e2a",
        accent: "#00e5a0",
        accent2: "#00c4ff",
        "text-primary": "#d0d0dc",
        "text-dim": "#6e6e82",
        "text-bright": "#f0f0f6",
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', "sans-serif"],
        mono: ['"Space Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
