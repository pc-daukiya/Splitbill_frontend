/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Montserrat"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        theme: {
          bg:      'var(--color-bg)',
          surface: 'var(--color-surface)',
          accent:  'var(--color-accent)',
          text:    'var(--color-text)',
          subtext: 'var(--color-subtext)',
          border:  'var(--color-border)',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(6, 182, 212, 0.15), 0 24px 80px -32px rgba(6, 182, 212, 0.2)',
      },
      backgroundImage: {
        'grid-slate':
          'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.15) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
