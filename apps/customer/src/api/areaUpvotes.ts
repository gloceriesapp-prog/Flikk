// Maps to POST /area-upvotes (backend/src/routes/areaUpvotes.ts) — public,
// no login required (a customer outside the delivery zone may not even be
// signed in yet). See UpvoteAreaBar.tsx/UnavailableZoneSection.tsx.
import { apiRequest } from './client';

export function submitAreaUpvote(payload: { latitude: number; longitude: number; addressLabel: string }): Promise<{ ok: true }> {
  return apiRequest('/area-upvotes', { method: 'POST', body: payload, auth: false });
}

export function subscribeAreaWaitlist(payload: { latitude: number; longitude: number; addressLabel: string }) {
  return apiRequest('/area-upvotes/subscribe', { method: 'POST', body: payload });
}
