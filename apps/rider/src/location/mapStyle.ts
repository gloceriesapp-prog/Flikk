// Google Maps JSON style — a flat, desaturated gray look, same family
// apps/customer's own LocationSearchScreen uses (copied, not shared — see
// specs/00-foundation/repo-structure.md), so the delivery map reads as one
// consistent Flikk visual language instead of default Google Maps'
// saturated greens/yellows/blues competing with the rider/customer pins.
// `customMapStyle` only has any effect with `provider={PROVIDER_GOOGLE}`
// (react-native-maps) — Apple Maps ignores it entirely, which is fine
// since iOS has no Google Maps API key configured here and falls back to
// default Apple Maps regardless (see app.config.js's own note).
export const GRAYSCALE_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f2f2f2' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f2f2f2' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e6e6e6' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d6dade' }] },
];
