import { fireEvent, render } from '@testing-library/react-native';
import { ProductCardCartControl } from '../src/screens/home/products/ProductCardCartControl';
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));

it('switches between plus and quantity controls without bubbling to the product card', async () => {
  const onAdd = jest.fn(), onIncrement = jest.fn(), onDecrement = jest.fn();
  const props = { name: 'Milk', compact: false, chooseOptions: false, onAdd, onIncrement, onDecrement };
  const view = await render(<ProductCardCartControl {...props} quantity={0} />);
  const stopPropagation = jest.fn();
  await fireEvent.press(view.getByRole('button', { name: 'Add Milk to cart' }), { stopPropagation });
  expect(onAdd).toHaveBeenCalledTimes(1);
  await view.rerender(<ProductCardCartControl {...props} quantity={1} />);
  expect(view.getByText('1')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Increase quantity of Milk' }), { stopPropagation });
  await fireEvent.press(view.getByRole('button', { name: 'Decrease quantity of Milk' }), { stopPropagation });
  expect(onIncrement).toHaveBeenCalledTimes(1);
  expect(onDecrement).toHaveBeenCalledTimes(1);
  expect(stopPropagation).toHaveBeenCalledTimes(3);
  await view.rerender(<ProductCardCartControl {...props} quantity={0} />);
  expect(view.queryByText('1')).toBeNull();
  expect(view.getByRole('button', { name: 'Add Milk to cart' })).toBeTruthy();
});
it('continues to open selection for products with choices instead of editing a default pack', async () => {
  const onAdd = jest.fn();
  const view = await render(<ProductCardCartControl name="Milk" compact={false} quantity={2} chooseOptions onAdd={onAdd} onIncrement={jest.fn()} onDecrement={jest.fn()} />);
  expect(view.queryByRole('button', { name: 'Increase quantity of Milk' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Add Milk to cart' }), { stopPropagation: jest.fn() });
  expect(onAdd).toHaveBeenCalledTimes(1);
});
