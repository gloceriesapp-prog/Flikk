import { HEADER_COLORS, headerColorFor } from '../src/screens/home/header-theme/homeHeaderTheme';

jest.mock('react-native-reanimated', () => ({}));

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const onWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

it('header colour: Udupi > Pre-order > category tab > All', () => {
  expect(headerColorFor({ udupi: true, preorder: true, tabName: 'Fresh' })).toBe('#852B27');
  expect(headerColorFor({ udupi: false, preorder: true, tabName: 'Fresh' })).toBe(HEADER_COLORS.preorder);
  expect(headerColorFor({ udupi: false, preorder: false, tabName: 'Fresh' })).toBe('#16A34A');
  expect(headerColorFor({ udupi: false, preorder: false })).toBe('#0C1413');
});

it('every fixed header colour keeps the white header text readable (4.5:1+)', () => {
  for (const hex of Object.values(HEADER_COLORS)) expect(onWhite(hex)).toBeGreaterThanOrEqual(4.5);
});
