/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eefdf3',
          100: '#d6fae2',
          200: '#b0f2c8',
          300: '#79e5a6',
          400: '#3fd07d',
          500: '#1ab15d',
          600: '#0f8f49',
          700: '#0e703c',
          800: '#0f5933',
          900: '#0d492b',
          950: '#042917',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e2',
          300: '#b0b9c9',
          400: '#8593ab',
          500: '#66748f',
          600: '#515d76',
          700: '#434c60',
          800: '#3a4152',
          900: '#333947',
          950: '#0b0e14',
        },
      },
      boxShadow: {
        soft: '0 2px 8px 0 rgba(15, 23, 42, 0.06), 0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        card: '0 4px 24px -4px rgba(15, 23, 42, 0.10)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
