// Single placeholder used everywhere a real product/store photo would go —
// swap this one constant when real images are ready and every card updates at
// once. Replaces the earlier per-item random picsum.photos images. Store cards
// render store.photoUrl and fall back to this when a store has no photo yet.
import { storageUrl } from '../utils/storageUrl';
export const PLACEHOLDER_IMAGE_URI =
  storageUrl('Images/___8_-removebg-preview.png');
