/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        fundo:      "#F7F9FB",
        superficie: "#FFFFFF",
        texto:      "#0F1B2D",
        secundario: "#5B6B7F",
        borda:      "#DCE3EC",
        primaria:   "#0E5FD8",
        ok:         "#0F9D6C",
        atencao:    "#D97706",
        risco:      "#C81E3A",
      },
    },
  },
  plugins: [],
};