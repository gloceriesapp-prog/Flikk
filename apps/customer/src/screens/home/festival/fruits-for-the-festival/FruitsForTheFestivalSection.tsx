import { FestivalProductRow } from '../components/FestivalProductRow';

export function FruitsForTheFestivalSection() {
  return <FestivalProductRow collection="festival-fruits" limit={6} layout="grid" buttonLabel="Explore festival fruits" />;
}
