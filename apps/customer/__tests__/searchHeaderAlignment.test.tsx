import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { SearchHeader } from '../src/screens/search/components/SearchHeader';
import { GILROY } from '../src/theme/fonts';
jest.mock('../src/api/appConfig', () => ({ useCopy: () => 'Search products' }));
jest.mock('../src/components/icons/IconlyChevronLeft', () => ({ IconlyChevronLeft: () => null }));
jest.mock('../src/components/icons/IconlyClose', () => ({ IconlyClose: () => null }));
jest.mock('../src/screens/home/components/RotatingSearchHint', () => ({ RotatingSearchHint: () => null }));
it('keeps empty and typed text vertically centered with the same font metrics', async () => {
  const onChangeText = jest.fn();
  const view = await render(<SearchHeader value="" onChangeText={onChangeText} onBack={jest.fn()} />);
  const empty = StyleSheet.flatten(view.getByLabelText('Search products').props.style);
  await fireEvent.changeText(view.getByLabelText('Search products'), 'mango');
  expect(onChangeText).toHaveBeenCalledWith('mango');
  await view.rerender(<SearchHeader value="mango" onChangeText={onChangeText} onBack={jest.fn()} />);
  const typed = StyleSheet.flatten(view.getByLabelText('Search products').props.style);
  expect(typed).toMatchObject({ height: 44, paddingTop: 0, paddingBottom: 0, fontFamily: GILROY.medium, fontSize: 16, textAlignVertical: 'center', includeFontPadding: false });
  expect(typed).toEqual(empty);
});
