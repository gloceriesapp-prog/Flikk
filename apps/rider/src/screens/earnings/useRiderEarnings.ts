import { useQuery } from '@tanstack/react-query';
import { fetchRiderEarnings } from '../../api/earnings';

export function useRiderEarnings() {
  return useQuery({ queryKey: ['riderEarnings'], queryFn: fetchRiderEarnings });
}
