export const DELIVERY_INSTRUCTION_OPTIONS = [
  { id: 'call', label: 'Call on arrival', instruction: 'Call me on arrival.' },
  { id: 'no_bell', label: 'Don’t ring the bell', instruction: 'Do not ring the doorbell.' },
  { id: 'door', label: 'Leave at the door', instruction: 'Leave the order at my door.' },
  { id: 'hand', label: 'Hand it to me', instruction: 'Hand the order to me.' },
] as const;
export type DeliveryInstructionId = typeof DELIVERY_INSTRUCTION_OPTIONS[number]['id'];

export function parseDeliveryInstructions(saved?: string | null) {
  const selected: DeliveryInstructionId[] = [];
  const custom: string[] = [];
  for (const line of (saved ?? '').split('\n')) {
    const option = DELIVERY_INSTRUCTION_OPTIONS.find(item => item.instruction === line.trim());
    if (option) {
      if (!selected.includes(option.id)) selected.push(option.id);
    } else custom.push(line);
  }
  return { custom: custom.join('\n').trim(), selected };
}

export function toggleDeliveryInstruction(selected: DeliveryInstructionId[], id: DeliveryInstructionId) {
  if (selected.includes(id)) return selected.filter(value => value !== id);
  // A delivery cannot be both handed over and left at the door.
  const opposite = id === 'door' ? 'hand' : id === 'hand' ? 'door' : null;
  return [...selected.filter(value => value !== opposite), id];
}

export function composeDeliveryInstructions(custom: string, selected: DeliveryInstructionId[]) {
  return [custom.trim(), ...DELIVERY_INSTRUCTION_OPTIONS.filter(item => selected.includes(item.id))
    .map(item => item.instruction)].filter(Boolean).join('\n');
}
