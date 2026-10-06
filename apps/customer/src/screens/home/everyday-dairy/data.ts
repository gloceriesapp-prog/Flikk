// Name-based merchandising until the catalogue has structured dairy tags.
// Exclude plant alternatives and personal-care products from daily dairy.
function dairyGroup(names: string): RegExp {
  return new RegExp(`^(?!.*\\b(?:coconut|almond|oat|soy|soya|plant|vegan|soap|shampoo|lotion|body|skin|face)\\b).*\\b(?:${names})\\b`, 'i');
}

export const EVERYDAY_DAIRY_GROUPS = [
  dairyGroup('milk'),
  dairyGroup('curd|dahi|yoghurt|yogurt'),
  dairyGroup('paneer'),
  dairyGroup('butter|ghee'),
  dairyGroup('cheese'),
  dairyGroup('buttermilk|lassi|cream'),
];
