import { fireEvent, render, screen } from '@testing-library/react-native';
import { PRE_ORDER_WIDTH, PreOrderNavButton } from '../src/components/BottomNavBar/PreOrderNavButton';

it('Pre-order tab: "Pre" / "order" on two lines, narrow, opens Pre-order', async () => {
  const onPress = jest.fn();
  await render(<PreOrderNavButton height={44} onPress={onPress} />);
  expect(screen.getByText('Pre')).toBeTruthy();
  expect(screen.getByText('order')).toBeTruthy();
  const button = screen.getByLabelText('Pre-order');
  expect(button.props.style).toMatchObject({ width: PRE_ORDER_WIDTH, height: 44 });
  expect(PRE_ORDER_WIDTH).toBeLessThanOrEqual(76);
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});
