import type { Config } from "tailwindcss"

export default {
  darkMode: "class",
  content: [
    './pages/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx,mdx}',
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [
    require("tailwindcss-animate")
  ],
} satisfies Config
