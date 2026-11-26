// Last store-review prompt per customer, on this device. No server field
// holds it today; the OS also limits how often the popup can appear, so a
// reinstall resetting this is harmless. Failures read as "never prompted"
// only for reads that fail cleanly; any error skips the prompt upstream.
import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (customerId: string) => `store-review:last-prompt:${customerId}`;

export interface LastReviewPrompt { at: number; orderId: string }

export async function readLastReviewPrompt(customerId: string): Promise<LastReviewPrompt | null> {
  const raw = await AsyncStorage.getItem(key(customerId));
  if (!raw) return null;
  const value = JSON.parse(raw) as Partial<LastReviewPrompt>;
  return typeof value.at === 'number' && typeof value.orderId === 'string' ? { at: value.at, orderId: value.orderId } : null;
}

export async function writeLastReviewPrompt(customerId: string, prompt: LastReviewPrompt): Promise<void> {
  await AsyncStorage.setItem(key(customerId), JSON.stringify(prompt));
}

// Issues the customer reported from the app (Help → Email support about an
// order, or a payment). The review prompt skips those orders, and pauses
// for a while after any report.
const issuesKey = (customerId: string) => `store-review:issues:${customerId}`;
const MAX_REPORTED_IDS = 20;

export interface IssueReports { lastAt: number | null; orderIds: string[] }

export async function readIssueReports(customerId: string): Promise<IssueReports> {
  const raw = await AsyncStorage.getItem(issuesKey(customerId));
  if (!raw) return { lastAt: null, orderIds: [] };
  const value = JSON.parse(raw) as Partial<IssueReports>;
  return {
    lastAt: typeof value.lastAt === 'number' ? value.lastAt : null,
    orderIds: Array.isArray(value.orderIds) ? value.orderIds.filter((id): id is string => typeof id === 'string') : [],
  };
}

// orderId is an order or trip id; omitted for a report not about one order.
export async function recordIssueReport(customerId: string, orderId: string | undefined, now = Date.now()): Promise<void> {
  const current = await readIssueReports(customerId);
  const orderIds = orderId ? [orderId, ...current.orderIds.filter(id => id !== orderId)].slice(0, MAX_REPORTED_IDS) : current.orderIds;
  await AsyncStorage.setItem(issuesKey(customerId), JSON.stringify({ lastAt: now, orderIds }));
}
