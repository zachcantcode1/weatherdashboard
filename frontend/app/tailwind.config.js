/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
    './index.html',
	],
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animate")],
}
