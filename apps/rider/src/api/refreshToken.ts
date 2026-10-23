// Which refresh token to redeem on a 401 (no React Native imports, so
// refreshToken.selfcheck.ts runs under plain Node). Two writers rotate the
// session: this client (memory + SecureStore) and the background location
// task (backgroundLocation.ts), which can only write SecureStore. Supabase
// refresh tokens are single-use, so after a background refresh the copy in
// memory is already spent; redeeming it would end the rider's session.
// SecureStore always holds the newest pair, so it wins.
export function latestRefreshToken(stored: string | null | undefined, inMemory: string | null | undefined): string | null {
  return stored || inMemory || null;
}
