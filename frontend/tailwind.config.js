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
        dark: {
          bg: '#090D1A',
          card: '#121829',
          border: '#1E2943',
          hover: '#192239',
          text: '#F3F4F6',
          muted: '#9CA3AF'
        },
        light: {
          bg: '#F9FAFB',
          card: '#FFFFFF',
          border: '#E5E7EB',
          hover: '#F3F4F6',
          text: '#111827',
          muted: '#6B7280'
        },
        primary: {
          DEFAULT: '#00C6FF',
          dark: '#0072FF',
          light: '#E6F9FF'
        },
        accent: {
          pink: '#EC4899',
          purple: '#8B5CF6',
          emerald: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
