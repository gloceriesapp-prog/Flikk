import { REGIONAL_PREVIEW_PRODUCTS } from '../preview/data';
import { RegionalShopCard } from './RegionalShopCard';

export function PreviewShopCard({ index }: { index: number }) {
  return (
    <RegionalShopCard
      name={`Sample neighbourhood shop ${index + 1}`}
      products={REGIONAL_PREVIEW_PRODUCTS.slice(index * 3, index * 3 + 3)}
      previewOnly
    />
  );
}
