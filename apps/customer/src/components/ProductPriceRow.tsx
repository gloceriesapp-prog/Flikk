import { Text } from 'react-native';
import { GILROY } from '../theme/fonts';
import { priceComparison, discountPercentLabel } from './priceComparison';

interface Props {
  price: number;
  originalPrice?: number;
  size?: number;
  showMrpLabel?: boolean;
  showDiscount?: boolean;
  onDark?: boolean;
}

// Nested text shares a real baseline. Scale the complete row on narrow cards
// rather than wrapping the MRP or discount onto a separate line.
export function ProductPriceRow({ price, originalPrice, size = 18, showMrpLabel = false, showDiscount = true, onDark = false }: Props) {
  const { mrp } = priceComparison(price, originalPrice);
  const discount = discountPercentLabel(price, originalPrice);
  const secondarySize = Math.round(size * 0.72);
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
      accessibilityLabel={`₹${price}${mrp !== undefined ? `, MRP ₹${mrp}` : ''}${showDiscount && discount ? `, ${discount}% off` : ''}`}
      style={{ fontFamily: GILROY.bold, fontSize: size, lineHeight: Math.ceil(size * 1.35), color: onDark ? '#FFFFFF' : '#101C10', includeFontPadding: false }}>
      ₹{price}
      {mrp !== undefined ? <Text style={{ fontSize: secondarySize, color: onDark ? '#FFFFFF99' : '#8A8F8B' }}>{showMrpLabel ? '  MRP ' : '  '}<Text style={{ textDecorationLine: 'line-through' }}>₹{mrp}</Text></Text> : null}
      {showDiscount && discount ? <Text style={{ fontSize: secondarySize, color: onDark ? '#8FE3B0' : '#00A650' }}>  {discount}% off</Text> : null}
    </Text>
  );
}
