/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral near-black surfaces (kept under the `navy` key so existing
        // utility classes keep working after the redesign).
        navy: {
          950: '#0a0a0b', // page background
          900: '#0e0e10', // nav / header
          800: '#151517', // cards
          700: '#1c1c20', // raised / inputs
          600: '#292930', // borders / hover
        },
        // Coral accent (kept under the `gold` key for the same reason).
        gold: {
          DEFAULT: '#ff5b45',
          400: '#ff8266',
          500: '#ff5b45',
          600: '#f0432c',
          700: '#c9331e',
        },
        ink: '#0a0a0b',
        surface: '#151517',
        line: 'rgba(255,255,255,0.08)',
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
