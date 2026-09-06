// Google Maps JSON style — a flat, desaturated gray look, the same family
// of style Blinkit/Instamart/Swiggy use for their pin-confirm map so the
// pin and the delivery-callout bubble stay the visual focus instead of
// competing with default Google Maps' saturated greens/yellows/blues.
// `customMapStyle` only has any effect with `provider={PROVIDER_GOOGLE}`
// (react-native-maps) — Apple Maps ignores it entirely, which is fine
// since iOS has no Google Maps API key configured here and falls back to
// default Apple Maps regardless (see app.config.js's own note).
export const GRAYSCALE_MAP_STYLE = [
  // Ground is real white now (was #f2f2f2) — per an explicit ask, the flat
  // gray ground was reading as low-contrast/muddy rather than clean. Roads
  // and buildings below get their own light-gray tones specifically so
  // they still stand out against a pure white ground instead of vanishing
  // into it the way they would have on the old #f2f2f2/near-white pairing.
  { elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  // Building footprints get their own fill + stroke, distinct from the
  // blanket landscape color above — per an explicit ask for the "3D box"
  // look Google Maps' own building rendering has. That box/shadow effect
  // is baked into the SDK's renderer for this feature type, not something
  // a JSON style can draw itself; it only shows up once buildings aren't
  // colored identically to the ground around them. Darker/more saturated
  // than the old #e9ebf1/#d5d9e2 pair specifically because the ground is
  // now pure white — the previous pairing read as invisible pale squares
  // once there was no gray ground left to contrast against.
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#e4e7ee' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#b9c0cd' }] },
  // POI/road labels are back on now, per an explicit ask — the earlier
  // "hide everything so the pin stays the focus" pass also hid every
  // street/place name, leaving the map genuinely blank/unreadable rather
  // than just visually calm. POI icons still hidden (labels.icon's own
  // rule above already does that globally) so it's text labels only, not
  // full-color business icon clutter — a middle ground, not a straight
  // revert to default Google Maps. Roads are light gray now (were white),
  // since white roads on a white ground were invisible.
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#eceff3' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#eceff3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dfe3e9' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#eceff3' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d6dade' }] },
];
