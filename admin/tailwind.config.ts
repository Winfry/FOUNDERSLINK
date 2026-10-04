import type { Config } from "tailwindcss";
import founderlinkPreset from "../shared/design-tokens/tailwind.preset.js";

// The FoundersLink admin theme lives here and in src/app/globals.css.
// Colours are CSS variables (RGB channels) so opacity modifiers work.
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  presets: [founderlinkPreset],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: rgb("background"),
        foreground: rgb("foreground"),
        // Blue = what you can press.
        primary: {
          DEFAULT: rgb("primary"),
          dark: rgb("primary-hover"),
          light: rgb("primary-tint"),
        },
        // Navy = the sidebar and one hero block per page.
        navy: rgb("navy"),
        // Orange = where you are. Never a button, never under white text.
        accent: {
          DEFAULT: rgb("accent"),
          light: rgb("accent-tint"),
        },
        muted: {
          DEFAULT: rgb("muted"),
          foreground: rgb("muted"),
        },
        border: rgb("border"),
        surface: rgb("surface"),
        destructive: {
          DEFAULT: rgb("destructive"),
          light: rgb("destructive-tint"),
        },
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
      },
      ringColor: {
        DEFAULT: rgb("primary"),
      },
      // The shared preset doubles the first eight spacing steps, which
      // makes icons and padding twice the size the classes read as. The
      // dashboard uses the standard 4px scale.
      spacing: {
        1: "0.25rem",
        2: "0.5rem",
        3: "0.75rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        7: "1.75rem",
        8: "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
