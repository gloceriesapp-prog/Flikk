const NON_STAPLE = /\b(chips?|biscuits?|cookies?|namkeen|juice|drinks?|noodles?|batter|bread|flakes?|poha|puffed|cake|soap|shampoo|hair|body)\b/i;
const staple = (terms: string) => new RegExp(`^(?!.*${NON_STAPLE.source}).*\\b(${terms})\\b`, 'i');

export const KITCHEN_GROUPS = [
  staple('rice'),
  staple('atta|flour'),
  staple('dal|dals|lentils?|pulses?|toor|moong|urad|chana'),
  staple('oil|ghee'),
  staple('salt'),
  staple('sugar|jaggery'),
  staple('masala|masalas|spices?|turmeric|chilli|cumin|coriander powder|pepper'),
];
