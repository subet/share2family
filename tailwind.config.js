/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: { light: '#FAFAF7', dark: '#0F0F0F' },
        surface: { light: '#FFFFFF', dark: '#1A1A1A' },
        accent: '#D97757',
      },
    },
  },
  plugins: [],
};
