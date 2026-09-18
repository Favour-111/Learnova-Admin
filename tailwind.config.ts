import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#FFFFFF",
        surface: "#FFFFFF",
        backgroundAlt: "#FAFAFC",
        border: "#EEEEF2",
        primary: {
          DEFAULT: "#7C5CFC",
          soft: "#F1ECFF",
          dark: "#5E3FE0",
        },
        textPrimary: "#14121F",
        textSecondary: "#6B6779",
        textMuted: "#A6A2B2",
        success: "#34C77B",
        "success-soft": "#E7FBF1",
        danger: "#FF5C5C",
        "danger-soft": "#FFECEC",
        warning: "#F5B93D",
        "warning-soft": "#FFF6E2",
      },
      borderRadius: {
        card: "20px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 6px 16px rgba(26,16,48,0.06)",
        card: "0 10px 24px rgba(26,16,48,0.08)",
      },
      keyframes: {
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "toast-in": "toast-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
