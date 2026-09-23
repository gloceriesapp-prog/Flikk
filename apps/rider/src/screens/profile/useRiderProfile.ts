import { useQuery } from '@tanstack/react-query';
import { fetchRiderProfile } from '../../api/profile';

export function useRiderProfile() {
  return useQuery({ queryKey: ['riderProfile'], queryFn: fetchRiderProfile });
}
