// Match the named fruit, not broad category labels that may include unrelated
// inventory. Assortment descriptions remain seller-authored.
export const FESTIVAL_FRUIT_GROUPS: RegExp[] = [
  /\b(bananas?|baalehannu|balehannu)\b/i,
  /\b(apples?|oranges?|mosambi|sweet lime)\b/i,
  /\b(pomegranates?|grapes?|guavas?|papayas?)\b/i,
  /\b(fruit assortments?|fruit baskets?|mixed fruits?|fruit packs?|fruit boxes?)\b/i,
];
