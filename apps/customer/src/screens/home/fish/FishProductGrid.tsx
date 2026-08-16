// Thin wrapper over the shared ProductSection (see ../products/) — this file
// only exists to pair the Fresh Fish catalog with its section title.

import { ProductSection } from '../products/ProductSection';
import { FISH_PRODUCTS } from './data';

export function FishProductGrid() {
  return <ProductSection title="Fresh Fish, Straight off the Boat" products={FISH_PRODUCTS} />;
}
