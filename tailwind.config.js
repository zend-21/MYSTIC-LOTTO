import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
    "./types.ts",
  ],
  safelist: [
    'animate-pulse',
    'animate-bounce',
    'animate-ping',
    'animate-spin',
    'blur-[1px]',
    'opacity-20',
    'duration-[5000ms]',
  ],
  theme: {
    extend: {
      fontFamily: {
        mystic: ['Cinzel', 'serif'],
        sans: ['Noto Sans KR', 'sans-serif'],
      },
      animation: {
        'pulse-gold':          'pulse-gold 3s infinite',
        'dimension-shift':     'dimension-shift 1.5s cubic-bezier(0.19, 1, 0.22, 1) forwards',
        'hologram':            'hologram 10s ease infinite',
        'mega-sweep':          'mega-sweep 10s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'spin-slow':           'spin 15s linear infinite',
        'spin-extremely-slow': 'spin 80s linear infinite',
      },
      keyframes: {
        'pulse-gold': {
          '0%':   { boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.2)' },
          '70%':  { boxShadow: '0 0 0 20px rgba(212, 175, 55, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(212, 175, 55, 0)' },
        },
        'dimension-shift': {
          '0%':   { transform: 'scale(0.9)', filter: 'blur(20px) brightness(0)', opacity: '0' },
          '100%': { filter: 'none', opacity: '1' },
        },
        'hologram': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        'mega-sweep': {
          '0%':        { transform: 'translateX(-400%) skewX(-30deg)' },
          '15%, 100%': { transform: 'translateX(400%) skewX(-30deg)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
