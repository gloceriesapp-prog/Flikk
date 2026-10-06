import { AppError } from '../lib/errors.js';
import { uuid } from '../support/contracts.js';
export function notificationCursor(value: unknown): {
    id: string;
    created_at: string;
} | null {
    if (value === undefined)
        return null;
    try {
        if (typeof value !== 'string' || value.length > 300)
            throw new Error('Invalid cursor');
        const cursor = JSON.parse(Buffer.from(value, 'base64url').toString());
        const id = uuid(cursor.id);
        if (typeof cursor.created_at !== 'string')
            throw new Error('Invalid date');
        return { id, created_at: new Date(cursor.created_at).toISOString() };
    }
    catch {
        throw new AppError(400, 'INVALID_CURSOR', 'Invalid notification cursor.');
    }
}
