import { defaultShouldDehydrateQuery, dehydrate, hydrate, type DehydratedState, type Query, type QueryClient } from '@tanstack/react-query';
// Offline cold start: public catalogue queries are saved to device storage so
// a launch with no network paints the last Home/catalogue (under the
// OfflineBanner) instead of a blank "Finding shops" screen. Hand-rolled on
// react-query's own dehydrate/hydrate rather than the persist-client packages:
// the account QueryClient is replaced on every account change (accountCache),
// which a provider-level persister doesn't model, and this is ~40 lines.
//
// Storage is injected (App.tsx passes AsyncStorage) so accountCache stays
// loadable from backend's node tests without a native module.
export interface PersistStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}
const STORAGE_KEY = 'gloceries.query-cache';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Android AsyncStorage can't read back a value over ~2 MB; skip such a write.
const MAX_BYTES = 1_500_000;
const SAVE_THROTTLE_MS = 1000;
// Allowlist by query-key root: public, read-mostly catalogue only. Never cart,
// checkout quotes, payments, orders, addresses, profile or anything keyed by
// customer id. 'home' includes the nearest-store lookup Home gates on.
const PERSISTED_ROOTS = new Set(['home', 'home-content', 'home-tabs', 'category-sections', 'inventory-zone', 'store-list', 'app-config']);
export function shouldPersistQuery(query: Query): boolean {
    return PERSISTED_ROOTS.has(String(query.queryKey[0])) && defaultShouldDehydrateQuery(query);
}
interface Saved { buster: string; savedAt: number; state: DehydratedState }
export function createQueryPersistence(storage: PersistStorage, buster: string, now: () => number = Date.now) {
    // Every storage op runs in call order, so a discard queued before the
    // next account's restore can never be overtaken by it.
    let chain: Promise<unknown> = Promise.resolve();
    const run = (op: () => Promise<unknown>) => { chain = chain.then(op).catch(() => { /* Persistence is best-effort; the network still works. */ }); return chain; };
    let detach = () => { };
    return {
        attach(client: QueryClient): Promise<unknown> {
            detach();
            let attached = true;
            let timer: ReturnType<typeof setTimeout> | undefined;
            let unsubscribe = () => { };
            const save = () => {
                timer = undefined;
                if (!attached) return;
                void run(async () => {
                    const value = JSON.stringify({ buster, savedAt: now(), state: dehydrate(client, { shouldDehydrateQuery: shouldPersistQuery }) } satisfies Saved);
                    await (value.length > MAX_BYTES ? storage.removeItem(STORAGE_KEY) : storage.setItem(STORAGE_KEY, value));
                });
            };
            detach = () => { attached = false; clearTimeout(timer); unsubscribe(); };
            return run(async () => {
                try {
                    const raw = await storage.getItem(STORAGE_KEY);
                    const saved = raw ? JSON.parse(raw) as Saved : null;
                    // hydrate keeps whichever copy is newer, so a fetch that
                    // already landed is never overwritten by the saved one.
                    if (attached && saved?.buster === buster && now() - saved.savedAt < MAX_AGE_MS) hydrate(client, saved.state);
                } catch { /* Unreadable snapshot: start cold; the next save replaces it. */ }
                if (!attached) return;
                // Subscribe only after restoring: an early save while offline
                // would overwrite the good snapshot with an empty cache.
                unsubscribe = client.getQueryCache().subscribe(() => { timer ??= setTimeout(save, SAVE_THROTTLE_MS); });
            });
        },
        // Account reset: stop saving the outgoing client and wipe its snapshot.
        discard(): Promise<unknown> {
            detach();
            return run(() => storage.removeItem(STORAGE_KEY));
        },
    };
}
export type QueryPersistence = ReturnType<typeof createQueryPersistence>;
