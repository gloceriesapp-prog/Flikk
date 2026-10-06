// Festival-independent names let this collection serve Navratri, Diwali and
// other celebrations. Round-robin selection keeps the shelf balanced.
export const PUJA_PRODUCT_LIMIT = 6;
export const PUJA_PRODUCT_GROUPS: RegExp[] = [
  /\b(diyas?|deepas?|earthen lamps?)\b/i,
  /\b(wicks?|cotton batti)\b/i,
  /\b(incense|agarbatti|dhoop)\b/i,
  /\b(kumkum|kunkum|sindoor)\b/i,
  /\b(turmeric|haldi)\b/i,
  /\b(camphor|kapoor|puja|pooja|sandalwood)\b/i,
];
