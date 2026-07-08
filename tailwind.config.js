/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep navy cinematic palette
        navy: {
          950: '#070b17',
          900: '#0b1120',
          800: '#111a2e',
          700: '#1a2540',
          600: '#243352',
        },
        gold: {
          DEFAULT: '#e8b84b',
          400: '#f0c968',
          500: '#e8b84b',
          600: '#d4a531',
          700: '#b3891f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Tahoma', 'sans-serif'],
        arabic: ['"Noto Kufi Arabic"', '"Segoe UI"', 'Tahoma', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.37)',
        gold: '0 0 20px rgba(232, 184, 75, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
        'fade-up': 'fade-up 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
