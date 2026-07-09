/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#13231d",
        forest: {
          50: "#effbf6",
          100: "#d7f4e7",
          500: "#17845f",
          600: "#106b4c",
          700: "#0b523d",
          800: "#0b4736",
          900: "#09392d"
        },
        sand: "#f5f1e8",
        gold: "#d8a638"
      },
      boxShadow: {
        panel: "0 14px 35px rgba(17, 42, 32, 0.08)"
      }
    }
  },
  plugins: []
};

