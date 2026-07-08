/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware surfaces (driven by CSS variables so light/dark flip).
        navy: {
          950: 'rgb(var(--bg) / <alpha-value>)', // page background
          900: 'rgb(var(--surface) / <alpha-value>)', // nav / header
          800: 'rgb(var(--card) / <alpha-value>)', // cards
          700: 'rgb(var(--raised) / <alpha-value>)', // raised / inputs
          600: 'rgb(var(--border) / <alpha-value>)', // borders / hover
        },
        // Neutral overlay + text tokens that flip with the theme.
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        // Coral accent (same in both themes).
        gold: {
          DEFAULT: '#ff5b45',
          400: '#ff8266',
          500: '#ff5b45',
          600: '#f0432c',
          700: '#c9331e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
        arabic: ['"IBM Plex Sans Arabic"', '"Segoe UI"', 'Tahoma', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)',
        lift: '0 12px 40px rgba(0,0,0,0.5)',
        gold: '0 6px 20px rgba(255,91,69,0.35)',
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
      },
      animation: {
        'pop-in': 'pop-in 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
        'fade-up': 'fade-up 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
