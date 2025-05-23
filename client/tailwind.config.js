/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e17564',
        secondary: '#09122c',
      },
      animation: {
        'spin-slow': 'spin 10s linear infinite',
        'pulse-slow': 'pulse 3s linear infinite',
      },
    },
  },
  plugins: [],
}