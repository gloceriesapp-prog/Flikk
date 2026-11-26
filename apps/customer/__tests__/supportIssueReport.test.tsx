/* eslint-disable @typescript-eslint/no-require-imports -- Hoisted Jest mocks resolve modules at runtime. */
import type { ComponentProps } from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupportScreen } from '../src/features/customer-care/SupportScreen';
import { readIssueReports } from '../src/features/store-review/storage';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../src/api/appConfig', () => ({ useAppConfig: () => ({ support: { email: 'hello@gloceries.com' } }), useCopy: () => '' }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/store/useAuthStore', () => ({ useAuthStore: (select: (s: unknown) => unknown) => select({ accessToken: 't', customerId: 'c1' }) }));

const screen = (params: unknown) => ({ navigation: { goBack: jest.fn(), navigate: jest.fn() }, route: { params } }) as unknown as ComponentProps<typeof SupportScreen>;
const ORDER = '00000000-0000-4000-8000-000000000001';

beforeEach(async () => { await AsyncStorage.clear(); jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined); });
afterEach(() => jest.restoreAllMocks());

it('emailing support about an order records it, pausing the review prompt', async () => {
  const view = await render(<SupportScreen {...screen({ target: { orderId: ORDER }, category: 'delivery' })} />);
  await fireEvent.press(view.getByText('Email support'));
  await waitFor(async () => expect((await readIssueReports('c1')).orderIds).toEqual([ORDER]));
});

it('general help with no order records nothing', async () => {
  const view = await render(<SupportScreen {...screen(undefined)} />);
  await fireEvent.press(view.getByText('Email support'));
  await waitFor(() => expect(Linking.openURL).toHaveBeenCalled());
  expect(await readIssueReports('c1')).toEqual({ lastAt: null, orderIds: [] });
});
