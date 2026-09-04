// Single placeholder used everywhere a real product photo would go — swap
// this one constant when real images are ready and every card updates at
// once. Same convention as apps/customer/src/theme/placeholderImage.ts.
export const PLACEHOLDER_IMAGE_URI =
  'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/___8_-removebg-preview.png';

// Store owner's profile photo gets a distinct random image (picsum.photos,
// seeded so it stays stable across renders/sessions instead of reshuffling)
// — same convention as apps/customer's getStoreImageUri. Real profile
// photos come once store onboarding (P1/P6) exists.
export function getAvatarImageUri(seed: string): string {
  return `https://picsum.photos/seed/${seed}/200/200`;
}
