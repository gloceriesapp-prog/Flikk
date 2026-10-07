// Single placeholder used everywhere a real product photo would go — swap
// this one constant when real images are ready and every card updates at
// once. Replaces the earlier per-item random picsum.photos images.
import { storageUrl } from '../utils/storageUrl';
export const PLACEHOLDER_IMAGE_URI =
  storageUrl('Images/___8_-removebg-preview.png');

// Stores specifically get a distinct random photo per store (picsum.photos,
// seeded so each store keeps the same image across renders/sessions instead
// of reshuffling) — real store photos come once store onboarding exists.
export function getStoreImageUri(seed: string): string {
  return `https://picsum.photos/seed/${seed}/300/300`;
}
