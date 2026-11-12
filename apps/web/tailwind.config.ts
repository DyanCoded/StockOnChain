import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        surface: "var(--surface)",
        green: "var(--green)",
        mint: "var(--mint)",
        gold: "var(--gold)",
      },
    },
  },
  plugins: [],
};

export default config;
