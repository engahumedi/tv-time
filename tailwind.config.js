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
        // Muted amber accent (same in both themes) — used only for small touches.
        gold: {
          DEFAULT: '#c9a24b',
          400: '#d6b56c',
          500: '#c9a24b',
          600: '#b08a38',
          700: '#8f6f2e',
        },
      },
      fontFamily: {
        // Clean grotesque for body, distinctive serif for headings.
        sans: ['Geist', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        arabic: ['"IBM Plex Sans Arabic"', '"Segoe UI"', 'Tahoma', 'sans-serif'],
      },
      borderRadius: {
        // De-carded: restrained radii, nothing softer than 8px on panels.
        lg: '0.375rem',
        xl: '0.5rem',
        '2xl': '0.5rem',
        '3xl': '0.625rem',
      },
      boxShadow: {
        // Neutral depth only — no coloured glows.
        soft: '0 1px 2px rgba(0,0,0,0.4)',
        lift: '0 16px 48px rgba(0,0,0,0.55)',
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
