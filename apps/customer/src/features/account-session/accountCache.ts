import { QueryClient } from '@tanstack/react-query';
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
let client = new QueryClient({ defaultOptions: { queries: { staleTime: 60000 } } });
export function accountQueryClient(): QueryClient { return client; }
export function clearAccountCache(): void {
    const previous = client;
    // Cancel before clearing; a late query completion cannot repopulate this
    // account's cache. The next account receives a different client instance.
    void previous.cancelQueries();
    previous.clear();
    client = new QueryClient({ defaultOptions: { queries: { staleTime: 60000 } } });
}
const resets = new Set<() => void>();
export function registerAccountReset(reset: () => void): () => void {
    resets.add(reset);
    return () => { resets.delete(reset); };
}
export function resetAccountData(): void {
    clearAccountCache();
    for (const reset of resets)
        reset();
}
