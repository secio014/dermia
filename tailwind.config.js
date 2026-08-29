/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter_400Regular", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        fundo: "rgb(var(--fundo) / <alpha-value>)",
        superficie: "rgb(var(--superficie) / <alpha-value>)",
        texto: "rgb(var(--texto) / <alpha-value>)",
        secundario: "rgb(var(--secundario) / <alpha-value>)",
        borda: "rgb(var(--borda) / <alpha-value>)",
        primaria: "rgb(var(--primaria) / <alpha-value>)",
        "primaria-suave": "rgb(var(--primaria-suave) / <alpha-value>)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        atencao: "rgb(var(--atencao) / <alpha-value>)",
        risco: "rgb(var(--risco) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
