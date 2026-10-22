import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DeliveryInstructionsCard } from '../src/screens/address/components/DeliveryInstructionsCard';
import { composeDeliveryInstructions, parseDeliveryInstructions, toggleDeliveryInstruction,
  type DeliveryInstructionId } from '../src/screens/address/deliveryInstructions';

jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));

it('preserves written directions and restores saved options on edit', () => {
  const saved = composeDeliveryInstructions('First floor, side entrance', ['call', 'no_bell']);
  expect(parseDeliveryInstructions(saved)).toEqual({ custom: 'First floor, side entrance', selected: ['call', 'no_bell'] });
  expect(parseDeliveryInstructions('Use the back gate.')).toEqual({ custom: 'Use the back gate.', selected: [] });
  expect(composeDeliveryInstructions('', [])).toBe('');
});

it('replaces conflicting handover instructions and allows deselecting all options', () => {
  expect(toggleDeliveryInstruction(['call', 'door'], 'hand')).toEqual(['call', 'hand']);
  expect(toggleDeliveryInstruction(['hand'], 'door')).toEqual(['door']);
  expect(toggleDeliveryInstruction(['call'], 'call')).toEqual([]);
});

it('selects and clears cards, replaces conflicting choices and respects the saved text limit', async () => {
  function Form() {
    const [selected, setSelected] = useState<DeliveryInstructionId[]>([]);
    return <DeliveryInstructionsCard selected={selected} custom="Ground floor" onChange={setSelected} />;
  }
  const view = await render(<Form />);
  const door = () => view.getByRole('checkbox', { name: 'Leave at the door' });
  const hand = () => view.getByRole('checkbox', { name: 'Hand it to me' });
  await fireEvent.press(door());
  expect(door().props.accessibilityState.checked).toBe(true);
  await fireEvent.press(hand());
  expect(door().props.accessibilityState.checked).toBe(false);
  expect(hand().props.accessibilityState.checked).toBe(true);
  await fireEvent.press(hand());
  expect(hand().props.accessibilityState.checked).toBe(false);
  const onChange = jest.fn();
  await view.rerender(<DeliveryInstructionsCard selected={[]} custom={'x'.repeat(299)} onChange={onChange} />);
  expect(door().props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(door());
  expect(onChange).not.toHaveBeenCalled();
});
