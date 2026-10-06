export type TrackingState = 'loading' | 'connection-error' | 'request-error' | 'unavailable' | 'ready' | 'stale';
export function trackingState(input: {
    hasData: boolean;
    empty: boolean;
    pending: boolean;
    paused: boolean;
    error: unknown;
}): TrackingState {
    const error = input.error as {
        status?: number;
        code?: string;
    } | null;
    if (error && [401, 403, 404, 410].includes(error.status ?? 0))
        return 'unavailable';
    if (input.hasData && !input.empty)
        return error || input.paused ? 'stale' : 'ready';
    if (input.paused || (error && (error.status === 0 || ['NETWORK_ERROR', 'TIMEOUT'].includes(error.code ?? ''))))
        return 'connection-error';
    if (error)
        return 'request-error';
    if (input.pending)
        return 'loading';
    return 'unavailable';
}
