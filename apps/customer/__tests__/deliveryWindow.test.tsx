import { render, screen } from '@testing-library/react-native';
import { EtaPill } from '../src/components/EtaPill';
import { deliveryWindowFor, formatWindow } from '../src/utils/deliveryWindow';

jest.mock('../src/api/deliverySettings', () => ({ useDeliveryEstimateMinutes: () => 35 }));
jest.mock('../src/utils/useOperatingHours', () => ({ useIsOutsideOperatingHours: () => false }));

const windows = [
  { category: 'Non Veg', minMinutes: 45, maxMinutes: 60, note: 'cut fresh' },
  { category: 'Bakery', minMinutes: 30, maxMinutes: 40, note: null },
];

describe('delivery window', () => {
  it('normal categories keep the one estimate', () => {
    expect(deliveryWindowFor(['Milk & Dairy Drinks'], 35, windows)).toEqual({ min: 35, max: 35, note: null, category: null });
    expect(formatWindow(deliveryWindowFor([undefined], 35, windows))).toBe('35 mins');
  });
  it('a slower category shows its range (case-insensitive)', () => {
    expect(deliveryWindowFor(['non veg'], 35, windows)).toEqual({ min: 45, max: 60, note: 'cut fresh', category: 'Non Veg' });
    expect(formatWindow({ min: 45, max: 60 })).toBe('45–60 mins');
  });
  it('a cart takes its slowest category', () => {
    expect(deliveryWindowFor(['Milk & Dairy Drinks', 'Bakery', 'Non Veg'], 35, windows).max).toBe(60);
    expect(deliveryWindowFor(['Milk & Dairy Drinks', 'Bakery'], 35, windows)).toMatchObject({ min: 35, max: 40 });
  });
  it('never promises faster than the normal estimate', () => {
    expect(deliveryWindowFor(['Bakery'], 50, windows)).toEqual({ min: 50, max: 50, note: null, category: null });
  });
  it('the card pill shows the range', async () => {
    await render(<EtaPill minutes={45} maxMinutes={60} />);
    expect(screen.getByText('45–60 mins')).toBeTruthy();
    expect(screen.getByLabelText('Delivery in 45–60 minutes')).toBeTruthy();
  });
});
