/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        }
      }
    },
  },
  plugins: [],
}
