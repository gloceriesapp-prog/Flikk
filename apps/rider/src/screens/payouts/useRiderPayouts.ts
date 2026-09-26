import { useQuery } from '@tanstack/react-query';
import { fetchRiderPayouts } from '../../api/payouts';

export function useRiderPayouts() {
  return useQuery({ queryKey: ['riderPayouts'], queryFn: fetchRiderPayouts });
}
