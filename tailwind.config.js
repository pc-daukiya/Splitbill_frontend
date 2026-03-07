/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(34, 211, 238, 0.18), 0 24px 80px -32px rgba(34, 211, 238, 0.35)',
      },
      backgroundImage: {
        'grid-slate':
          'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.12) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
