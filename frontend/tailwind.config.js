/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0A0A0F',
          card: '#12121E',
          hover: '#1A1A2E',
          sidebar: '#07070B',
          player: '#0B0B12',
        },
        primary: {
          DEFAULT: '#6C63FF',
          hover: '#5B52EE',
          light: '#8E87FF',
        },
        accent: {
          DEFAULT: '#FF6584',
          hover: '#EE4E70',
        },
        gray: {
          dark: '#1C1C2E',
          text: '#9CA3AF',
          muted: '#4B5563',
          border: '#24243C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Sora', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
}
