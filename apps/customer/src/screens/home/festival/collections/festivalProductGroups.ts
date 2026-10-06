import { PUJA_PRODUCT_GROUPS } from '../puja-essentials/data';
import { FLOWER_PRODUCT_GROUPS } from '../flowers-and-garlands/data';
import { SWEET_PRODUCT_GROUPS } from '../sweets-to-share/data';
import { FESTIVAL_FRUIT_GROUPS } from '../fruits-for-the-festival/data';
import { LIGHT_PRODUCT_GROUPS, DECOR_PRODUCT_GROUPS } from '../light-up-home/data';

// One relevance definition for festival offers and participating merchants.
export const FESTIVAL_PRODUCT_GROUPS = [
  ...PUJA_PRODUCT_GROUPS,
  ...FLOWER_PRODUCT_GROUPS,
  ...SWEET_PRODUCT_GROUPS,
  ...FESTIVAL_FRUIT_GROUPS,
  ...LIGHT_PRODUCT_GROUPS,
  ...DECOR_PRODUCT_GROUPS,
];
