import { fireEvent, render } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../src/navigation/types';
import { OrderRatingScreen } from '../src/features/order-rating/screens/OrderRatingScreen';
import { createCompletedOrderPreview } from '../src/screens/purchase/preview/completedOrder';
import { useOrderRatingPreview } from '../src/features/order-rating/preview';

jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/AppImage', () => ({ AppImage: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

it('rates the rider and every ordered item independently before completing the local preview', async () => {
  const back = jest.fn();
  const props = { navigation: { goBack: back }, route: { name: 'OrderRating', key: 'rating', params: { previewOnly: true } } } as unknown as NativeStackScreenProps<AppStackParamList, 'OrderRating'>;
  const view = await render(<OrderRatingScreen {...props} />);
  expect(view.getByRole('button', { name: 'Send feedback', disabled: true })).toBeTruthy();
  await fireEvent.press(view.getByLabelText('Rate delivery 3 out of 5'));
  const items = createCompletedOrderPreview().items;
  expect(items).toHaveLength(7);
  await fireEvent.press(view.getByLabelText(`Rate ${items[0].name} 5 out of 5`));
  expect(view.getByLabelText(`Rate ${items[1].name} 1 out of 5`).props.accessibilityState.selected).toBe(false);
  expect(view.getByRole('button', { name: 'Send feedback', disabled: true })).toBeTruthy();
  for (const item of items.slice(1)) {
    expect(view.getByText(item.name)).toBeTruthy();
    await fireEvent.press(view.getByLabelText(`Rate ${item.name} 4 out of 5`));
  }
  await fireEvent.press(view.getByRole('button', { name: 'Send feedback', disabled: false }));
  expect(view.getByText('Thanks for your feedback')).toBeTruthy();
  expect(useOrderRatingPreview.getState().rating).toBe(3);
  await fireEvent.press(view.getByText('Done'));
  expect(back).toHaveBeenCalledTimes(1);
});
