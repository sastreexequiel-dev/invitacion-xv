import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#07060a", 900: "#0c0b10", 800: "#131219", 700: "#1c1a24" },
        champagne: { DEFAULT: "#d9bc84", light: "#f3e3bf", dark: "#a8854a", deep: "#7a5c2e" },
        silver: { DEFAULT: "#c9ccd3", dim: "#8d919b" },
        pearl: "#fbf8f2",
      },
      fontFamily: {
        script: ['"Pinyon Script"', "cursive"],
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ["Jost", "system-ui", "sans-serif"],
      },
      letterSpacing: { luxe: "0.38em" },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 50%" }, "100%": { backgroundPosition: "200% 50%" } },
        sweep: { "0%": { transform: "translateX(-120%) skewX(-20deg)" }, "60%,100%": { transform: "translateX(220%) skewX(-20deg)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(8px)" } },
        eq: { "0%,100%": { transform: "scaleY(.3)" }, "50%": { transform: "scaleY(1)" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        shimmer: "shimmer 6s linear infinite",
        sweep: "sweep 3.6s ease-in-out infinite",
        float: "float 2.4s ease-in-out infinite",
        eq: "eq 1s ease-in-out infinite",
        spinSlow: "spinSlow 40s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
