/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: "#020d0c",
          dark: "#010807",
        },
        canvas: "#090b0c",
        slateframe: "#1d2329",
        cardbg: "#07152b",
        pteal: {
          DEFAULT: "#087b6d",
          vibrant: "#169889",
        },
        cyan: {
          cyber: "#38bdf8",
        },
        flame: "#ff6819",
        bankgold: "#f3dc64",
        fraudrose: "#f43f5e",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "JetBrains Mono", "Courier", "monospace"],
      },
      keyframes: {
        "window-light": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.92)" },
        },
      },
      animation: {
        "window-light-sequence": "window-light 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
