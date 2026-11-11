import { render, screen } from '@testing-library/react-native';
import { PreviewUpdateInfo } from '../src/features/app-updates/PreviewUpdateInfo';
import { runningUpdateIdentity as identity } from '../src/features/app-updates/nativeUpdateIdentity';

jest.mock('../src/features/app-updates/nativeUpdateIdentity', () => ({ runningUpdateIdentity: {
  channel: 'preview', updateId: 'a0000000-0000-4000-8000-000000000001', runtimeVersion: 'ios-native-3',
  sourceCommit: 'a'.repeat(40), embedded: false, emergency: false,
} }));
it('shows exact preview IDs for physical-device verification', async () => {
  identity.channel = 'preview';
  await render(<PreviewUpdateInfo />);
  expect(screen.getByText(`Update: ${identity.updateId}`)).toBeTruthy();
  expect(screen.getByText(`Runtime: ${identity.runtimeVersion}`)).toBeTruthy();
  expect(screen.getByText('Downloaded update')).toBeTruthy();
});
it('keeps developer diagnostics out of the production customer UI', async () => {
  identity.channel = 'production';
  await render(<PreviewUpdateInfo />);
  expect(screen.queryByTestId('ota-preview-info')).toBeNull();
});
