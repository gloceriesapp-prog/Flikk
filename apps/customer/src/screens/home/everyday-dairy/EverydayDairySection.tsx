import { GroceryCollectionSection } from '../groceries/components/GroceryCollectionSection';
import { useHomePicks } from '../sections/useHomePicks';
import { EVERYDAY_DAIRY_GROUPS } from './data';

// Hand-picked dairy (admin Home Sections / Inventory) first, then
// name-matched dairy from nearby shops.
export function EverydayDairySection({ title = 'Everyday Dairy' }: { title?: string }) {
  const { data: picks } = useHomePicks();
  return <GroceryCollectionSection title={title} groups={EVERYDAY_DAIRY_GROUPS} maxProducts={8} pinnedProducts={picks?.['everyday-dairy']} />;
}
