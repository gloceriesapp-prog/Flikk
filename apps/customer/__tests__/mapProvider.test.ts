import { Platform, UIManager } from 'react-native';
import { usesGoogleMaps } from '../src/location/mapProvider';

afterEach(() => jest.restoreAllMocks());

it.each([
  ['ios', true, true],
  ['ios', false, false],
  ['android', false, true],
] as const)('selects the provider for %s with Google view registered = %s', (os, registered, expected) => {
  jest.replaceProperty(Platform, 'OS', os);
  const viewManager = jest.spyOn(UIManager, 'hasViewManagerConfig').mockReturnValue(registered);

  expect(usesGoogleMaps()).toBe(expected);
  if (os === 'ios') expect(viewManager).toHaveBeenCalledWith('AIRGoogleMap');
});
