import { GroceryCollectionSection } from '../../groceries/components/GroceryCollectionSection';
import { GREENS_AND_HERBS_GROUPS, GREENS_PREVIEW_PRODUCTS } from './data';

export function GreensAndHerbsSection() {
  return <GroceryCollectionSection title="Greens & Herbs" groups={GREENS_AND_HERBS_GROUPS} maxProducts={6} previewProducts={GREENS_PREVIEW_PRODUCTS} />;
}
