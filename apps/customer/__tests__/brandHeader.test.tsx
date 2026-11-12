import { render, screen } from '@testing-library/react-native';
import { BrandHeader } from '../src/screens/categories/components/BrandHeader';
jest.mock('../src/components/AppImage', () => ({ AppImage: require('react-native').Image }));
it('uses the separate banner without replacing the category logo', async () => {
  const brand = { name: 'Brand', imageUrl: 'https://example.com/logo.png', bannerUrl: 'https://example.com/banner.png' };
  await render(<BrandHeader brand={brand} />);
  expect(screen.getByLabelText('Brand banner').props.source.uri).toBe(brand.bannerUrl);
  expect(screen.queryByLabelText('Brand logo')).toBeNull();
});
it('preserves the logo header for existing brands without a banner', async () => {
  await render(<BrandHeader brand={{ name: 'Brand', imageUrl: 'https://example.com/logo.png' }} />);
  expect(screen.getByLabelText('Brand logo').props.source.uri).toBe('https://example.com/logo.png');
});
