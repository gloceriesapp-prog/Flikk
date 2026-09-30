// GET /home/sections (public) — admin-driven Home layout: per-section enabled
// flag, order (sortIndex), title/subtitle overrides, and an optional bg color.
// Same apiRequest + react-query convention as useFestivalGreeting.
//
// The renderer (AllTabSections) treats this as an OVERLAY on its own code-level
// section registry: a row's config tweaks a section that already exists in
// code; a section with no row falls back to code defaults. So the layout never
// breaks if the fetch fails or a new code section has no row yet.
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';

export interface HomeSectionConfig {
  key: string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  sortIndex: number;
  bgColor: string | null;
}

export function useHomeSections() {
  return useQuery({
    queryKey: ['home', 'sections'],
    queryFn: () => apiRequest<HomeSectionConfig[]>('/home/sections', { auth: false }),
  });
}
