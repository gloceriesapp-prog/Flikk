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
