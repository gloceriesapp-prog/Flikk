// Catalog lives in the app, not the web. Every "shop"/"order" surface on the
// marketing site routes to the download CTA rather than a fake web-store route.
// The footer download area provides id="app-download-banner" on every page.
// This anchor scrolls to it. One const so category tiles, trust bar, and stats all point at the
// same target — change the destination here if a web catalog ever ships.
export const APP_DOWNLOAD_HREF = "#app-download-banner";
