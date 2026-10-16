import { apiRequest } from './client';

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  owner_reply: string | null;
  created_at: string;
  users: { name: string | null } | null;
}

export interface TeamMember {
  user_id: string;
  role: 'manager';
  users: { name: string | null } | null;
}

interface Page<T> { items: T[]; nextCursor: string | null }
const pageQuery = (cursor?: string) => `page=1&limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;

export const managementApi = {
  reviews: (cursor?: string) => apiRequest<Page<Review>>(`/partner/reviews?${pageQuery(cursor)}`),
  reply: (id: string, reply: string) => apiRequest<Review>(`/partner/reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: { reply },
  }),
  team: (cursor?: string) => apiRequest<Page<TeamMember>>(`/partner/team?${pageQuery(cursor)}`),
  remove: (id: string) => apiRequest(`/partner/team/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  replace: (field: string, value: string) => apiRequest<{ pendingReview: boolean }>('/partner/document-replacements', {
    method: 'POST', body: { [field]: value },
  }),
};
