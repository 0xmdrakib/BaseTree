import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050509",
        card: "#070712",
        accent: {
          DEFAULT: "#8b5cf6",
          soft: "#a855f7",
        },
      },
      fontFamily: {
        sans: ["system-ui", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 50px rgba(139, 92, 246, 0.35)",
      },
      borderRadius: {
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
