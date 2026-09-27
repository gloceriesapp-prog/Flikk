import { useQuery } from '@tanstack/react-query';
import { fetchRiderStats } from '../../api/stats';

export function useRiderStats() {
  return useQuery({ queryKey: ['riderStats'], queryFn: fetchRiderStats });
}
