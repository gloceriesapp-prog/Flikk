import { GroceryCollectionSection } from '../components/GroceryCollectionSection';
import { PANTRY_EXTRAS_GROUPS } from './data';
import { PANTRY_EXTRAS_PREVIEW } from './previewProducts';

export function PicklesSaucesSpreadsSection() {
  return <GroceryCollectionSection title="Pickles, Sauces & Spreads" groups={PANTRY_EXTRAS_GROUPS} previewProducts={PANTRY_EXTRAS_PREVIEW} />;
}
