// Exclude processed products so onion powder and tomato ketchup cannot be
// presented as fresh vegetables just because their names contain a match.
const freshItem = (names: string) => new RegExp(`^(?!.*\\b(powder|paste|sauce|ketchup|pickles?|chips?|juice|biscuits?|cookies?|bread|cake|oil|dried|dehydrated)\\b).*\\b(${names})\\b`, 'i');

export const EVERYDAY_FRESH_GROUPS = [
  freshItem('onions?|pyaz|erulli'),
  freshItem('tomatoes?|tamatar'),
  freshItem('potatoes?|aloo|batate'),
  freshItem('bananas?|plantains?'),
  freshItem('lemons?|limes?|nimbu'),
  freshItem('coriander|cilantro|dhaniya|kothambari'),
];
