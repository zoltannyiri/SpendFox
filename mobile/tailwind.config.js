/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        fox: {
          navy: '#19386e',
          cyan: '#11d8d8',
          cyanPressed: '#10adad',
          cream: '#fff7e6',
          orange: '#f28c28',
        },
      },
    },
  },
  plugins: [],
};
