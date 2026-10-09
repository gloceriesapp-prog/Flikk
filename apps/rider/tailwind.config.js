// Color values mirror src/theme/tokens.ts (specs/00-foundation/design-system.md).
// Same brand tokens as apps/customer and apps/partner — CLAUDE.md's design
// system section is explicit that the rider app "can be visually simpler
// ... but should still use these brand tokens for consistency, not a
// different palette." No custom webfont here (system font stack, per that
// same section's own default) — nothing to configure for that.
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
        // Button / call-to-action color. White text on it (contrast ~5.2:1).
        primary: '#155DFC',
        gold: '#D9A441',
        mist: '#F6FAF0',
        success: '#2E9E77',
        danger: '#D64545',
        // Surge-pay only — see tokens.ts's own note on why this is a
        // narrow exception to CLAUDE.md's locked palette, not a new brand
        // color.
        surge: '#fe9a00',
        'surge-soft': '#fef3c6',
      },
      borderRadius: {
        card: '16px',
        button: '13px',
      },
    },
  },
  plugins: [],
};
