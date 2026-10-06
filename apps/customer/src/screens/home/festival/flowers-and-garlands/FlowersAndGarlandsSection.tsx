import { FestivalProductRow } from '../components/FestivalProductRow';
import { FLOWER_PRODUCT_LIMIT } from './data';

export function FlowersAndGarlandsSection() {
  return <FestivalProductRow collection="flowers-and-garlands" limit={FLOWER_PRODUCT_LIMIT} buttonLabel="Explore flowers & garlands" />;
}
