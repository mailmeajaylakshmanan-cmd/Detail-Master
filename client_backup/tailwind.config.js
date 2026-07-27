/** @type {import('tailwindcss').Config} */
// Force Tailwind Recompilation
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#403939', // Card backgrounds, inputs, panels
          900: '#2d2828', // Intermediate dark shade
          950: '#1A1616', // Main application background
        },
        brand: {
          red: '#D91A3A',
          darkred: '#801426',
          gold: '#FCDF4C',
          white: '#FFFFFF'
        },
      },
    },
  },
  plugins: [],
};
