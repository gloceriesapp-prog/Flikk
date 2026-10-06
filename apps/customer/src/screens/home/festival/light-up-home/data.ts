export const LIGHT_PRODUCT_GROUPS: RegExp[] = [
  /\b(diyas?|deepas?|earthen lamps?)\b/i,
  /\b(fairy lights?|string lights?|decorative lights?|led lights?|candles?)\b/i,
];
export const DECOR_PRODUCT_GROUPS: RegExp[] = [
  /\b(rangoli|kolam)\b/i,
  /\b(torans?|door decor|door hangings?|bandhanwar|festive decor)\b/i,
];

export const HOME_DISCOVERY_CARDS = [
  { collection: 'lights-and-diyas', title: 'Lights & Diyas', detail: 'A little festive glow', background: '#FFF1D6', accent: '#AE7026' },
  { collection: 'rangoli-and-decor', title: 'Rangoli & Decor', detail: 'Colour for your doorstep', background: '#F8E6E8', accent: '#A45669' },
] as const;
