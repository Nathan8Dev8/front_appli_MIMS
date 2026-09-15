import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mims: {
          50: '#EAF0FB',
          100: '#D2E0F5',
          200: '#A8C4EB',
          300: '#7CA6DE',
          400: '#4F84C9',
          500: '#2C63A8',
          600: '#1B4C8C',
          700: '#113E7D',
          800: '#0C2F60',
          900: '#081F42',
        },
        mist: {
          50: '#FFFFFF',
          100: '#F7FAFA',
          200: '#F0F4F4',
          300: '#E2E8E8',
          400: '#CBD5D5',
        },
        ink: {
          900: '#101828',
          700: '#344054',
          500: '#667085',
          300: '#D0D5DD',
        },
        gold: {
          100: '#FBF3D9',
          300: '#E9CC7C',
          500: '#C9A227',
        },
      },
      fontFamily: {
        display: ['var(--font-sora)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        card: '0 1px 1px rgba(17, 62, 125, 0.04), 0 10px 24px -10px rgba(17, 62, 125, 0.16)',
        hover: '0 2px 4px rgba(17, 62, 125, 0.06), 0 20px 36px -12px rgba(17, 62, 125, 0.22)',
        lift: '0 24px 48px -12px rgba(8, 31, 66, 0.32)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.4)',
      },
      backgroundImage: {
        // Le halo radial est superposé directement dans la valeur (calques CSS
        // séparés par une virgule) : deux classes bg-* distinctes ne peuvent
        // pas se cumuler, la dernière écrase toujours la précédente.
        'mims-gradient':
          'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.14), transparent 55%), linear-gradient(135deg, #113E7D 0%, #1B4C8C 45%, #2C63A8 100%)',
        'mims-gradient-soft': 'linear-gradient(180deg, #0C2F60 0%, #113E7D 100%)',
        canvas: 'radial-gradient(ellipse 80% 60% at 15% -10%, rgba(17,62,125,0.06), transparent 60%), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(201,162,39,0.05), transparent 55%)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        'loading-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(40%)' },
          '100%': { transform: 'translateX(280%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'loading-bar': 'loading-bar 1.3s ease-in-out infinite',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
