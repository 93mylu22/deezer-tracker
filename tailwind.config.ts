import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#120F1D",
        surface: "#181430",
        border: "#2C2645",
        accent: "#7C3AED",
        accentLight: "#C9A8FF",
        muted: "#8B86A0",
      },
    },
  },
  plugins: [],
};

export default config;
