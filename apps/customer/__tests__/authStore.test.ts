import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../src/store/useAuthStore';

const CUSTOMER_ID = '11111111-2222-4333-8444-555555555555';
const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${b64url({ alg: 'none' })}.${b64url({ sub: CUSTOMER_ID })}.sig`;

describe('useAuthStore', () => {
  it('hydrates to a logged-out guest-capable state when no token is saved', async () => {
    await useAuthStore.getState().hydrate();
    const state = useAuthStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.accessToken).toBeNull();
    expect(state.customerId).toBeNull();
    expect(state.hydrationError).toBeNull();
    state.continueAsGuest();
    expect(useAuthStore.getState().isGuest).toBe(true);
  });

  it('setSession persists the token pair and exposes the customer', async () => {
    await useAuthStore.getState().setSession(token, 'refresh-1');
    const state = useAuthStore.getState();
    expect(state.customerId).toBe(CUSTOMER_ID);
    expect(state.accessToken).toBe(token);
    expect(state.isGuest).toBe(false);
    const saved = JSON.parse((await SecureStore.getItemAsync('gloceries_customer_session_v2')) as string);
    expect(saved).toEqual({ version: 2, accessToken: token, refreshToken: 'refresh-1' });
  });

  it('rejects a token without a customer id', async () => {
    await expect(useAuthStore.getState().setSession('not-a-jwt', 'r')).rejects.toThrow();
  });
});
