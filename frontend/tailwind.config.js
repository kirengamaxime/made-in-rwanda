/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef7f1', 100: '#d5ebdd', 200: '#aad6bb', 500: '#2f8a58', 600: '#277048', 700: '#20603D', 800: '#194c31', 900: '#0f3320' },
        sky: { 50: '#e6f6fc', 100: '#c2e9f8', 500: '#00A1DE', 600: '#0088bd', 700: '#006a94' },
        sun: { 100: '#fef6c2', 300: '#fce473', 400: '#FAD201', 500: '#e0bb00' },
        ink: { 900: '#14201a', 700: '#33433a', 500: '#5c6b62', 300: '#a4b0a9', 200: '#d6ddd9', 100: '#e9eeeb', 50: '#f4f7f5' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Source Sans 3"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
