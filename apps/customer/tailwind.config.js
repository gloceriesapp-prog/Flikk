// Color values mirror src/theme/tokens.ts (specs/00-foundation/design-system.md).
// Keep both in sync by hand — tokens.ts stays the source of truth for any
// non-Tailwind-class usage (e.g. ActivityIndicator color props).
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        lime: '#A8D93A',
        'lime-deep': '#7CB518',
        'lime-soft': '#EEF7DC',
        ink: '#101C10',
        coral: '#FF6B4A',
        gold: '#D9A441',
        mist: '#F6FAF0',
        success: '#2E9E77',
        danger: '#D64545',
      },
      borderRadius: {
        card: '16px',
        button: '13px',
      },
    },
  },
  plugins: [],
};
