import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { OrderRatingStars } from '../src/screens/purchase/components/OrderRatingStars';

jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));

function Rating() {
  const [rating, setRating] = useState(0);
  return <OrderRatingStars rating={rating} onChange={setRating} />;
}

it('starts empty and selects every star up to the tapped rating, including when lowering it', async () => {
  const view = await render(<Rating />);
  expect(view.getAllByRole('button')).toHaveLength(5);
  expect(view.queryAllByRole('button', { selected: true })).toHaveLength(0);
  await fireEvent.press(view.getByLabelText('Rate 3 out of 5'));
  expect(view.getAllByRole('button', { selected: true })).toHaveLength(3);
  await fireEvent.press(view.getByLabelText('Rate 1 out of 5'));
  expect(view.getAllByRole('button', { selected: true })).toHaveLength(1);
  await fireEvent.press(view.getByLabelText('Rate 5 out of 5'));
  expect(view.getAllByRole('button', { selected: true })).toHaveLength(5);
});

it('preserves a submitted rating without accepting edits', async () => {
  const onChange = jest.fn();
  const view = await render(<OrderRatingStars rating={4} onChange={onChange} disabled />);
  await fireEvent.press(view.getByLabelText('Rate 2 out of 5'));
  expect(onChange).not.toHaveBeenCalled();
  expect(view.getAllByRole('button', { selected: true })).toHaveLength(4);
});
