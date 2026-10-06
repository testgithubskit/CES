/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f0fa',
          100: '#cce0f5',
          200: '#99c1eb',
          300: '#66a2e1',
          400: '#3383d7',
          500: '#004883',
          600: '#003a6b',
          700: '#002c53',
          800: '#001e3b',
          900: '#001023',
        },
      },
    },
  },
  plugins: [],
}
