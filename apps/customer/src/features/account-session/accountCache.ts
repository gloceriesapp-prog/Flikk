import { QueryClient } from '@tanstack/react-query';
// Network/timeout/5xx are worth retrying; 4xx (validation, auth, conflicts) are not.
// Duck-typed on ApiError's numeric status so this module stays import-free
// (useAuthStore and backend tests load it; api/client would form a cycle).
export function isRetryableError(error: unknown): boolean {
    const status = (error as { status?: unknown } | null)?.status;
    return typeof status !== 'number' || status === 0 || status >= 500;
}
// Queries are GETs: retry transient failures twice. Mutations (POST/PATCH/
// DELETE) never auto-retry — a replayed order/payment call is worse than an error.
const newClient = () => new QueryClient({
    defaultOptions: {
        queries: { staleTime: 60000, retry: (count, error) => count < 2 && isRetryableError(error) },
        mutations: { retry: false },
    },
});
export function customerIdFromToken(token: string | null): string | null {
    if (!token)
        return null;
    try {
        const value = token.split('.')[1];
        if (!value)
            return null;
        const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
        const { sub } = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
        return typeof sub === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub) ? sub : null;
    }
    catch {
        return null;
    }
}
let client = newClient();
export function accountQueryClient(): QueryClient { return client; }
export function clearAccountCache(): void {
    const previous = client;
    // Cancel before clearing; a late query completion cannot repopulate this
    // account's cache. The next account receives a different client instance.
    void previous.cancelQueries();
    previous.clear();
    client = newClient();
}
// keepGuestDraft: a guest just signed in. Their cart and delivery pin were
// never tied to another account, so they carry into the new session; every
// account-owned cache (queries, wishlist, push binding) still resets.
export interface AccountResetOptions { keepGuestDraft: boolean }
const resets = new Set<(options: AccountResetOptions) => void>();
export function registerAccountReset(reset: (options: AccountResetOptions) => void): () => void {
    resets.add(reset);
    return () => { resets.delete(reset); };
}
export function resetAccountData(options: AccountResetOptions = { keepGuestDraft: false }): void {
    clearAccountCache();
    for (const reset of resets)
        reset(options);
}
