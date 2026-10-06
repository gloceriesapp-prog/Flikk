import { GroceryCollectionSection } from '../groceries/components/GroceryCollectionSection';
import { EVERYDAY_DAIRY_GROUPS } from './data';

export function EverydayDairySection({ title = 'Everyday Dairy' }: { title?: string }) {
  return <GroceryCollectionSection title={title} groups={EVERYDAY_DAIRY_GROUPS} maxProducts={8} />;
}
