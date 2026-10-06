import { FestivalProductRow } from '../components/FestivalProductRow';

export function SweetsToShareSection() {
  return <FestivalProductRow collection="sweets-to-share" limit={6} buttonLabel="Explore local sweets" />;
}
