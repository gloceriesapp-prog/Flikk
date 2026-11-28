import { StyleSheet } from 'react-native';
import { actionColors } from '../../theme/tokens';

const BLUE = actionColors.fill;
// Product photos are 720x810 (8:9). Boxes use that shape so a photo fits
// exactly: no side gaps, no cropping. The card adds 6 pt padding + 1 pt border.
const PHOTO_RATIO = 720 / 810;
const PHOTO = 104;
const PAD = 7;
export const PICKER_CARD_WIDTH = PHOTO + PAD * 2 + 2;

// Floating card sheet (like a quick-add tray): rounded on every corner,
// inset from the screen edges, with a Done pill above it.
export const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12 },
  container: { backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden' },
  done: { position: 'absolute', top: -58, right: 0, height: 42, paddingHorizontal: 22, borderRadius: 21, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center' },
  doneText: { fontFamily: 'Gilroy-SemiBold', fontSize: 16, color: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: '#EEF0F3' },
  // Header photo: same 8:9 shape as the product photo, shown whole (no zoom).
  thumb: { width: 64, height: Math.round(64 / PHOTO_RATIO), borderRadius: 14, backgroundColor: '#F7F8FA', overflow: 'hidden' },
  headerName: { fontFamily: 'Gilroy-SemiBold', fontSize: 16, lineHeight: 21, color: '#151A17' },
  headerSub: { fontFamily: 'Gilroy-Medium', fontSize: 14, color: '#747A83', marginTop: 2 },
  sectionTitle: { fontFamily: 'Gilroy-Bold', fontSize: 17, color: '#151A17', paddingHorizontal: 20, marginBottom: 12 },
  options: { gap: 14, paddingHorizontal: 20, paddingTop: 16 },
  hint: { fontFamily: 'Gilroy-Medium', fontSize: 12, color: '#9AA0A8' },
  list: { paddingHorizontal: 20, paddingBottom: 18, gap: 10 },
  cartFooter: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, flexShrink: 0 },

  // One pack: a rounded photo inset 8 pt inside the card, then size and
  // price under it. The card is sized from the photo (no stray space).
  // The card itself (white, fully rounded); a stock tab may hang below it.
  card: { width: PICKER_CARD_WIDTH },
  cardBody: { padding: PAD, borderWidth: 1, borderColor: '#E6E8EC', borderRadius: 16, backgroundColor: '#FFFFFF', zIndex: 1 },
  cardOff: { opacity: 0.55 },
  imageBox: { width: PHOTO, height: Math.round(PHOTO / PHOTO_RATIO), backgroundColor: '#F7F8FA', borderRadius: 11, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  veg: { position: 'absolute', top: 6, right: 6, borderWidth: 1, borderRadius: 3, padding: 2, backgroundColor: '#FFFFFF' },
  vegDot: { width: 6, height: 6, borderRadius: 3 },
  plus: { position: 'absolute', right: 5, bottom: 5, width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: BLUE,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  stepper: { position: 'absolute', left: 6, right: 6, bottom: 5, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: BLUE,
    backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  step: { width: 32, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: 'Gilroy-Bold', fontSize: 18, color: BLUE },
  quantity: { fontFamily: 'Gilroy-Bold', fontSize: 15, color: '#151A17', minWidth: 18, textAlign: 'center' },
  details: { paddingHorizontal: 3, paddingTop: 8, paddingBottom: 2, gap: 2 },
  pack: { fontFamily: 'Gilroy-SemiBold', fontSize: 14, color: '#151A17' },
  flavour: { fontFamily: 'Gilroy-Medium', fontSize: 12.5, color: '#5D646B' },
  // Red strip along the card's bottom when a pack is nearly sold out (same
  // as the product page's Select quantity cards).
  // Tab tucked under the card's bottom edge, rounded at the bottom.
  stockStrip: { marginTop: -14, marginHorizontal: 1, paddingTop: 19, paddingBottom: 6, alignItems: 'center', backgroundColor: '#FDE8E6',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  stock: { fontFamily: 'Gilroy-Bold', fontSize: 12.5, color: '#D92D20' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  offLabel: { fontFamily: 'Gilroy-SemiBold', fontSize: 12, color: '#747A83' },
});
