import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#120F1D",
        surface: "#181430",
        surfaceRaised: "#211B3D",
        border: "#2C2645",
        accent: "#7C3AED",
        accentLight: "#C9A8FF",
        muted: "#8B86A0",
        up: "#34D399",
        down: "#FB7185",
      },
    },
  },
  plugins: [],
};

export default config;
