// Google Maps JSON style — a flat, desaturated gray look, the same family
// of style Blinkit/Instamart/Swiggy use for their pin-confirm map so the
// pin and the delivery-callout bubble stay the visual focus instead of
// competing with default Google Maps' saturated greens/yellows/blues.
// `customMapStyle` only has any effect with `provider={PROVIDER_GOOGLE}`
// (react-native-maps) — Apple Maps ignores it entirely, which is fine
// since iOS has no Google Maps API key configured here and falls back to
// default Apple Maps regardless (see app.config.js's own note).
export const GRAYSCALE_MAP_STYLE = [
  // Per an explicit ask/reference (Blinkit/Flipkart's own pin-confirm map)
  // — real building depth/shading only ever came from Google's own native
  // building renderer, never from a JSON style (a JSON style can only set
  // a flat fill/stroke color, no shadow or extrusion). The earlier flat
  // landscape.man_made fill+stroke override drawn here was a from-scratch
  // attempt at faking that "3D box" look, but it only ever produced plain
  // flat rectangles with a border — not what the reference shows. Removing
  // that override (and showsBuildings={false} on the MapView itself,
  // LocationSearchScreen.tsx's own note) lets Google's real building layer
  // render again, complete with its own shading. POI icons are back on too
  // (labels.icon's own visibility:'off' removed) — the reference shows real
  // colored POI badges (shop/lock icons), not text-only labels.
  // No blanket `elementType: 'geometry'` base rule (three different
  // versions of one were tried and each broke something else — hiding
  // buildings, then losing road contrast, then this Android SDK washing
  // EVERYTHING out to flat white regardless of the more specific rules
  // below, which means Android's style parser here doesn't reliably
  // resolve overlapping rules by specificity the way the style spec
  // otherwise implies). Every feature below sets its own explicit color
  // instead; ground left unstyled entirely falls back to Google's own
  // default (a pale cream, not pure white) rather than fighting for global
  // control of "geometry" and breaking unrelated features again.
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#eef0f4' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#d5d9e2' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  // Darkened (was #eceff3/#dfe3e9) — those were too close in luminance to
  // Google's own default ground color once the blanket white base rule
  // was removed (this file's own note above), so roads read as gone
  // rather than just slightly less contrasty. Real gray now, not a
  // near-white tint, so they stand out regardless of whatever the
  // unstyled ground ends up being.
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#c9ced6' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#c9ced6' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#b5bbc5' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#d6dae0' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d6dade' }] },
];
