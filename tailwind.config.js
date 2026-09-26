/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Master brand colors
        navy: {
          DEFAULT: '#071A3D',
          50: '#E8EDF7',
          100: '#C7D4ED',
          200: '#9FB5DE',
          300: '#6E8BCB',
          400: '#3F62B3',
          500: '#1A4593',
          600: '#0F3275',
          700: '#0A2570',
          800: '#071A3D',
          900: '#04102A',
        },
        royal: {
          DEFAULT: '#1565D8',
          50: '#EAF1FC',
          100: '#D0E1F8',
          200: '#A8C8F1',
          300: '#73A6E8',
          400: '#3F7FDB',
          500: '#1565D8',
          600: '#0F4FAB',
          700: '#0B3E87',
          800: '#082E63',
          900: '#051E40',
        },
        brand: {
          DEFAULT: '#2F80ED',
          50: '#EAF4FE',
          100: '#D0E7FC',
          200: '#A8D0F9',
          300: '#73B4F4',
          400: '#3F97EF',
          500: '#2F80ED',
          600: '#1A66C9',
          700: '#124FA0',
          800: '#0D3A78',
          900: '#082550',
        },
        // DataSub colors
        datasub: {
          emerald: '#10B981',
          green: '#22C55E',
          electric: '#0EA5E9',
          dark: '#062A2A',
        },
        // SchoolPro colors
        schoolpro: {
          purple: '#7C3AED',
          indigo: '#4F46E5',
          gold: '#FBBF24',
          soft: '#F5F3FF',
        },
        // Consult colors
        consult: {
          orange: '#F97316',
          magenta: '#DB2777',
          purple: '#7C3AED',
          charcoal: '#111827',
        },
        // Neutrals
        ink: '#172033',
        muted: '#64748B',
        surface: '#F5F8FE',
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(7, 26, 61, 0.08), 0 1px 3px -1px rgba(7, 26, 61, 0.06)',
        'card': '0 4px 24px -4px rgba(7, 26, 61, 0.10), 0 2px 8px -2px rgba(7, 26, 61, 0.06)',
        'float': '0 12px 40px -8px rgba(7, 26, 61, 0.18), 0 4px 12px -4px rgba(7, 26, 61, 0.10)',
        'glow-brand': '0 0 0 4px rgba(47, 128, 237, 0.12)',
        'glow-emerald': '0 0 0 4px rgba(16, 185, 129, 0.12)',
        'glow-purple': '0 0 0 4px rgba(124, 58, 237, 0.12)',
        'glow-orange': '0 0 0 4px rgba(249, 115, 22, 0.12)',
      },
      borderRadius: {
        'xl2': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.1)', opacity: '0' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-fast': 'fade-in-fast 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'count-up': 'count-up 0.5s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
