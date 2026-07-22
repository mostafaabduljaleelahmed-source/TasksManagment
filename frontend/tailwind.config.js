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
          bg: '#0F0F11',
          card: '#16161A',
          border: '#24242B',
          text: '#E4E4E7'
        }
      }
    },
  },
  plugins: [],
}
