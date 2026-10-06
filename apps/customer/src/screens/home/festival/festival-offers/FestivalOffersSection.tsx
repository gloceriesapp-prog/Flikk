import { FestivalProductRow } from '../components/FestivalProductRow';
import { FESTIVAL_OFFER_CARD_WIDTH, FESTIVAL_OFFER_LIMIT } from './data';

export function FestivalOffersSection() {
  return <FestivalProductRow collection="festival-offers" limit={FESTIVAL_OFFER_LIMIT} cardWidth={FESTIVAL_OFFER_CARD_WIDTH} />;
}
