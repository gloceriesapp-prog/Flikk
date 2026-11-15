import { fireEvent, render } from '@testing-library/react-native';
import { HomeCategoryBanner } from '../src/screens/home/category-page/components/HomeCategoryBanner';
import { MeatCategoryBanner } from '../src/screens/home/category-page/components/MeatCategoryBanner';
jest.mock('../src/components/AppImage', () => ({ AppImage: (props: object) => {
  const renderImage = require('react').createElement;
  return renderImage(require('react-native').Image, { ...props, testID: 'header-artwork' });
} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const imageUri = 'https://images.gloceries.com/appsui/udupi-header.webp';
it('shows the Admin header instead of bundled artwork and restores the default on failure', async () => {
  const view = await render(<HomeCategoryBanner imageUri={imageUri} imageAsset={1} />);
  expect(view.getByTestId('header-artwork', { includeHiddenElements: true }).props.source).toEqual({ uri: imageUri });
  await fireEvent(view.getByTestId('header-artwork', { includeHiddenElements: true }), 'error');
  expect(view.getByTestId('header-artwork', { includeHiddenElements: true }).props.source).toBe(1);
});
it('resets to the existing default when the override is removed', async () => {
  const view = await render(<HomeCategoryBanner imageUri={imageUri} imageAsset={1} />);
  await view.rerender(<HomeCategoryBanner imageAsset={1} />);
  expect(view.getByTestId('header-artwork', { includeHiddenElements: true }).props.source).toBe(1);
});
it('allows a Meat header override and preserves its bundled fallback', async () => {
  const view = await render(<MeatCategoryBanner imageUri={imageUri} />);
  expect(view.getByTestId('header-artwork', { includeHiddenElements: true }).props.source).toEqual({ uri: imageUri });
  await fireEvent(view.getByTestId('header-artwork', { includeHiddenElements: true }), 'error');
  expect(view.getByTestId('header-artwork', { includeHiddenElements: true }).props.source).not.toEqual({ uri: imageUri });
});
