/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Iris / indigo — the brand primary.
        brand: {
          50: '#f1f0ff',
          100: '#e6e4ff',
          200: '#d0ccff',
          300: '#b0a8ff',
          400: '#8b7dff',
          500: '#6e5cf6',
          600: '#5b46ea',
          700: '#4a37c7',
          800: '#3d2fa1',
          900: '#342a80',
        },
        // Coral — reserved for reactions, alerts, accents.
        coral: {
          400: '#ff8a73',
          500: '#ff6b5c',
          600: '#ed4f43',
        },
        ink: '#14141f',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,31,0.04), 0 8px 24px -12px rgba(20,20,31,0.12)',
        lift: '0 12px 40px -12px rgba(91,70,234,0.35)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.18s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};
