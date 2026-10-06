import { GroceryCollectionSection } from '../../groceries/components/GroceryCollectionSection';
import { EVERYDAY_FRESH_GROUPS } from './data';

export function EverydayFreshSection() {
  return <GroceryCollectionSection title="Everyday Fresh" groups={EVERYDAY_FRESH_GROUPS} maxProducts={6} />;
}
