import { QueryClient } from '@tanstack/react-query';
import type { QueryPersistence } from './queryPersistence';
// Network/timeout/5xx are worth retrying; 4xx (validation, auth, conflicts) are not.
// Duck-typed on ApiError's numeric status so this module stays import-free
// (useAuthStore and backend tests load it; api/client would form a cycle).
export function isRetryableError(error: unknown): boolean {
    const status = (error as { status?: unknown } | null)?.status;
    return typeof status !== 'number' || status === 0 || status >= 500;
}
// Full jitter over react-query's own exponential window (1s, 2s, ... capped at
// 30s): after an outage, every phone's retries spread out instead of landing
// on the recovering backend in the same instant. `random` injectable for tests.
export function queryRetryDelay(attempt: number, random: () => number = Math.random): number {
    return random() * Math.min(1000 * 2 ** attempt, 30000);
}
let persistence: QueryPersistence | null = null;
// Queries are GETs: retry transient failures twice. Mutations (POST/PATCH/
// DELETE) never auto-retry — a replayed order/payment call is worse than an error.
const newClient = () => {
    const created = new QueryClient({
        defaultOptions: {
            queries: { staleTime: 60000, retry: (count, error) => count < 2 && isRetryableError(error), retryDelay: (attempt) => queryRetryDelay(attempt) },
            mutations: { retry: false },
        },
    });
    void persistence?.attach(created);
    return created;
};
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
// App.tsx wires device storage in (queryPersistence.ts); unset in node tests.
export function configureQueryPersistence(next: QueryPersistence): void {
    persistence = next;
    void next.attach(client);
}
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
    // Wipe the saved snapshot before the next client restores from it, so one
    // account's cached screens never paint for the next person on this device.
    void persistence?.discard();
    clearAccountCache();
    for (const reset of resets)
        reset(options);
}
