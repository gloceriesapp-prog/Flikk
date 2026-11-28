// "Today on Gloceries" grid rules, shared by the backend endpoint
// (backend/src/today-grid) and the admin preview, so both run the exact same
// pure function. Plain ES modules + .d.ts, like packages/home-content.
export * from './types.js';
export * from './catalog.js';
export * from './config.js';
export * from './istClock.js';
export * from './buildTodayGrid.js';
