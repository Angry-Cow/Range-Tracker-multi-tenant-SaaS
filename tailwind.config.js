/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8eef5',
          100: '#c5d5e8',
          200: '#9eb9d8',
          300: '#769dc8',
          400: '#5888bb',
          500: '#3a73ae',
          600: '#2a5a8f',
          700: '#1c4470',
          800: '#0a4070',
          900: '#093057',
          950: '#061e37',
        },
      },
    },
  },
  plugins: [],
};
